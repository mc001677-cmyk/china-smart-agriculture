import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';

export interface Field {
  id: number;
  name: string;
  area: number; // in mu (亩)
  crop: string;
  boundary: [number, number][]; // Array of [lng, lat]
  center: [number, number];
  status: 'idle' | 'working' | 'completed';
  harvestProgress: number;
  avgYield?: number;
  avgMoisture?: number;
}

interface FieldContextType {
  fields: Field[];
  activeFieldId: number | null;
  setActiveFieldId: (id: number | null) => void;
  isLoading: boolean;
  refetch: () => void;
  createField: (data: CreateFieldInput) => Promise<void>;
  updateField: (id: number, data: UpdateFieldInput) => Promise<void>;
  deleteField: (id: number) => Promise<void>;
}

interface CreateFieldInput {
  name: string;
  cropType: string;
  area: number;
  boundaryGeoJson?: string;
  centerLat?: number;
  centerLng?: number;
}

interface UpdateFieldInput {
  name?: string;
  cropType?: string;
  area?: number;
  status?: 'idle' | 'working' | 'completed';
  harvestProgress?: number;
  avgYield?: number;
  avgMoisture?: number;
}

const FieldContext = createContext<FieldContextType | undefined>(undefined);

// Fallback mock data for when database is not available
const MOCK_FIELDS: Field[] = [
  {
    id: 1,
    name: '友谊-01号地块',
    area: 450,
    crop: '大豆',
    center: [131.82, 46.88],
    boundary: [
      [131.815, 46.885],
      [131.825, 46.885],
      [131.825, 46.875],
      [131.815, 46.875],
    ],
    status: 'working',
    harvestProgress: 35,
    avgYield: 850,
    avgMoisture: 14.5,
  },
  {
    id: 2,
    name: '友谊-02号地块',
    area: 320,
    crop: '玉米',
    center: [131.88, 46.88],
    boundary: [
      [131.876, 46.885],
      [131.885, 46.885],
      [131.885, 46.875],
      [131.876, 46.875],
    ],
    status: 'idle',
    harvestProgress: 0,
  },
  {
    id: 3,
    name: '友谊-03号地块',
    area: 580,
    crop: '水稻',
    center: [131.85, 46.82],
    boundary: [
      [131.845, 46.824],
      [131.865, 46.824],
      [131.865, 46.815],
      [131.845, 46.815],
    ],
    status: 'completed',
    harvestProgress: 100,
    avgYield: 920,
    avgMoisture: 15.2,
  }
];

// Helper to parse GeoJSON boundary to coordinate array
function parseBoundary(geoJson: string | null): [number, number][] {
  if (!geoJson) return [];
  try {
    const parsed = JSON.parse(geoJson);
    if (parsed.type === 'Polygon' && parsed.coordinates?.[0]) {
      // Remove the closing point (same as first point)
      const coords = parsed.coordinates[0];
      return coords.slice(0, -1).map((c: number[]) => [c[0], c[1]] as [number, number]);
    }
  } catch (e) {
    console.error('Failed to parse boundary GeoJSON:', e);
  }
  return [];
}

// Transform database field to frontend Field type
function transformField(dbField: {
  id: number;
  name: string;
  cropType: string;
  area: string;
  boundaryGeoJson: string | null;
  centerLat: string | null;
  centerLng: string | null;
  status: 'idle' | 'working' | 'completed';
  harvestProgress: string | null;
  avgYield: string | null;
  avgMoisture: string | null;
}): Field {
  return {
    id: dbField.id,
    name: dbField.name,
    area: parseFloat(dbField.area),
    crop: dbField.cropType,
    center: [
      parseFloat(dbField.centerLng || '131.85'),
      parseFloat(dbField.centerLat || '46.85'),
    ],
    boundary: parseBoundary(dbField.boundaryGeoJson),
    status: dbField.status,
    harvestProgress: parseFloat(dbField.harvestProgress || '0'),
    avgYield: dbField.avgYield ? parseFloat(dbField.avgYield) : undefined,
    avgMoisture: dbField.avgMoisture ? parseFloat(dbField.avgMoisture) : undefined,
  };
}

export function FieldProvider({ children }: { children: React.ReactNode }) {
  // 根据当前路由判断是否为「模拟运行模式」
  const [location] = useLocation();
  const isSimulateMode = location.startsWith("/simulate");

  // 全局地块状态：模拟模式用 MOCK；正式运行默认空（归零），等待真实数据写入/接入
  const [fields, setFields] = useState<Field[]>(() => (isSimulateMode ? MOCK_FIELDS : []));
  const [activeFieldId, setActiveFieldId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 从数据库获取正式运行的数据（仅在非模拟模式下启用）
  const { data: dbFields, refetch, isLoading: queryLoading } = trpc.fields.list.useQuery(
    undefined,
    {
      retry: 1,
      refetchOnWindowFocus: false,
      enabled: !isSimulateMode,
    }
  );

  // Mutations（仅用于正式运行模式）
  const createMutation = trpc.fields.create.useMutation({
    onSuccess: () => refetch(),
  });

  const updateMutation = trpc.fields.update.useMutation({
    onSuccess: () => refetch(),
  });

  const deleteMutation = trpc.fields.delete.useMutation({
    onSuccess: () => refetch(),
  });

  // 当切换到模拟模式时，重置为内置 MOCK 数据，避免和正式数据混用
  useEffect(() => {
    if (isSimulateMode) {
      setFields(MOCK_FIELDS);
      setActiveFieldId(null);
      setIsLoading(false);
    } else {
      // 正式运行：归零
      setFields([]);
      setActiveFieldId(null);
    }
  }, [isSimulateMode]);

  // 当处于正式运行模式且数据库返回数据时，覆盖本地状态
  useEffect(() => {
    if (!isSimulateMode) {
      if (dbFields && dbFields.length > 0) {
        const transformed = dbFields.map(transformField);
        setFields(transformed);
      }
      // 没有数据也算“加载完成”，避免一直转圈
      setIsLoading(queryLoading);
    }
  }, [dbFields, queryLoading, isSimulateMode]);

  // CRUD operations
  const createField = useCallback(
    async (data: CreateFieldInput) => {
      if (isSimulateMode) {
        // 在模拟模式下，只更新本地内存，不触发后端写入
        setFields(prev => {
          const nextId = prev.length > 0 ? Math.max(...prev.map(f => f.id)) + 1 : 1;
          const newField: Field = {
            id: nextId,
            name: data.name,
            area: data.area,
            crop: data.cropType,
            center: data.centerLat && data.centerLng ? [data.centerLng, data.centerLat] : [131.82, 46.88],
            boundary: [],
            status: "idle",
            harvestProgress: 0,
          };
          return [...prev, newField];
        });
        return;
      }

      await createMutation.mutateAsync(data);
    },
    [createMutation, isSimulateMode]
  );

  const updateField = useCallback(
    async (id: number, data: UpdateFieldInput) => {
      if (isSimulateMode) {
        setFields(prev =>
          prev.map(field =>
            field.id === id
              ? {
                  ...field,
                  name: data.name ?? field.name,
                  crop: data.cropType ?? field.crop,
                  area: data.area ?? field.area,
                  status: data.status ?? field.status,
                  harvestProgress: data.harvestProgress ?? field.harvestProgress,
                  avgYield: data.avgYield ?? field.avgYield,
                  avgMoisture: data.avgMoisture ?? field.avgMoisture,
                }
              : field
          )
        );
        return;
      }

      await updateMutation.mutateAsync({ id, ...data });
    },
    [updateMutation, isSimulateMode]
  );

  const deleteField = useCallback(
    async (id: number) => {
      if (isSimulateMode) {
        setFields(prev => prev.filter(field => field.id != id));
        if (activeFieldId === id) {
          setActiveFieldId(null);
        }
        return;
      }

      await deleteMutation.mutateAsync({ id });
    },
    [deleteMutation, isSimulateMode, activeFieldId]
  );

  return (
    <FieldContext.Provider
      value={{
        fields,
        activeFieldId,
        setActiveFieldId,
        isLoading,
        refetch,
        createField,
        updateField,
        deleteField,
      }}
    >
      {children}
    </FieldContext.Provider>
  );
}
export function useField() {
  const context = useContext(FieldContext);
  if (context === undefined) {
    throw new Error('useField must be used within a FieldProvider');
  }
  return context;
}
