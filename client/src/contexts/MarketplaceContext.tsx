import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { WorkOrder, BidInfo, MarketplaceUser, UserCertification, LeaderboardEntry, MarketplaceStats } from '@/types/marketplace';
import { sampleOrders, sampleLeaderboard, sampleStats, currentUserData } from '@/data/marketplaceData';
import { useLocation } from 'wouter';

interface MarketplaceContextType {
  // 订单管理
  orders: WorkOrder[];
  myOrders: WorkOrder[];
  availableOrders: WorkOrder[];
  
  // 用户信息
  currentUser: MarketplaceUser | null;
  
  // 竞价信息
  myBids: BidInfo[];
  
  // 排行榜
  leaderboard: LeaderboardEntry[];
  
  // 统计数据
  stats: MarketplaceStats;
  
  // 操作函数
  publishOrder: (order: Omit<WorkOrder, 'id' | 'orderId' | 'createdAt' | 'updatedAt'>) => Promise<WorkOrder>;
  cancelOrder: (orderId: string) => Promise<void>;
  placeBid: (orderId: string, bidPrice: number, message?: string) => Promise<BidInfo>;
  acceptBid: (bidId: string) => Promise<void>;
  rejectBid: (bidId: string) => Promise<void>;
  completeOrder: (orderId: string, trackingData: any) => Promise<void>;
  inspectOrder: (orderId: string, approved: boolean, notes?: string) => Promise<void>;
  reviewOrder: (orderId: string, review: any) => Promise<void>;
  
  // 认证相关
  submitCertification: (type: string, documentUrl: string) => Promise<UserCertification>;
  getCertifications: (userId: string) => Promise<UserCertification[]>;
  
  // 搜索和过滤
  searchOrders: (filters: any) => Promise<WorkOrder[]>;
  getLeaderboard: (workType?: string) => Promise<LeaderboardEntry[]>;
  
  // 加载状态
  loading: boolean;
  error: string | null;
}

const MarketplaceContext = createContext<MarketplaceContextType | undefined>(undefined);

export function MarketplaceProvider({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const isSimulateMode = location.startsWith('/simulate');

  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [myOrders, setMyOrders] = useState<WorkOrder[]>([]);
  const [availableOrders, setAvailableOrders] = useState<WorkOrder[]>([]);
  const [currentUser, setCurrentUser] = useState<MarketplaceUser | null>(null);
  const [myBids, setMyBids] = useState<BidInfo[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [stats, setStats] = useState<MarketplaceStats>({
    totalOrders: 0,
    completedOrders: 0,
    totalVolume: 0,
    totalTransactionAmount: 0,
    activeContractors: 0,
    activePublishers: 0,
    avgOrderValue: 0,
    platformRevenue: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 初始化示例数据
  useEffect(() => {
    if (isSimulateMode) {
      setOrders(sampleOrders);
      setAvailableOrders(sampleOrders.filter(o => o.status === '待抢单'));
      setMyOrders(sampleOrders.filter(o => o.publisherId === 'current_user'));
      setCurrentUser(currentUserData);
      setLeaderboard(sampleLeaderboard);
      setStats(sampleStats);
      return;
    }
    // 正式运行：全部归零（不注入示例数据）
    setOrders([]);
    setAvailableOrders([]);
    setMyOrders([]);
    setCurrentUser(null);
    setLeaderboard([]);
    setStats({
      totalOrders: 0,
      completedOrders: 0,
      totalVolume: 0,
      totalTransactionAmount: 0,
      activeContractors: 0,
      activePublishers: 0,
      avgOrderValue: 0,
      platformRevenue: 0,
    });
  }, [isSimulateMode]);

  const publishOrder = useCallback(async (order: Omit<WorkOrder, 'id' | 'orderId' | 'createdAt' | 'updatedAt'>) => {
    setLoading(true);
    try {
      // 模拟API调用
      const newOrder: WorkOrder = {
        ...order,
        id: `order_${Date.now()}`,
        orderId: `ORD-${new Date().toISOString().split('T')[0]}-${Math.floor(Math.random() * 1000)}`,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const updatedOrders = [...orders, newOrder];
      setOrders(updatedOrders);
      setMyOrders([...myOrders, newOrder]);
      if (newOrder.status === '待抢单') {
        setAvailableOrders([...availableOrders, newOrder]);
      }
      setError(null);
      return newOrder;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '发布订单失败';
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [orders, myOrders, availableOrders]);

  const cancelOrder = useCallback(async (orderId: string) => {
    setLoading(true);
    try {
      const updatedOrders = orders.map(o => o.id === orderId ? { ...o, status: '已取消' as const } : o);
      setOrders(updatedOrders);
      setMyOrders(myOrders.map(o => o.id === orderId ? { ...o, status: '已取消' as const } : o));
      setAvailableOrders(availableOrders.filter(o => o.id !== orderId));
      setError(null);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '取消订单失败';
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [orders, myOrders, availableOrders]);

  const placeBid = useCallback(async (orderId: string, bidPrice: number, message?: string) => {
    setLoading(true);
    try {
      const order = orders.length > 0 ? orders.find(o => o.id === orderId) : sampleOrders.find(o => o.id === orderId);
      if (!order) throw new Error('订单不存在');

      const user = currentUser || currentUserData;
      const newBid: BidInfo = {
        id: `bid_${Date.now()}`,
        orderId,
        contractorId: user.id || '',
        contractorName: user.name || '',
        contractorRating: user.rating || 0,
        bidPrice,
        totalPrice: bidPrice * order.area,
        estimatedDays: 3,
        message,
        createdAt: new Date(),
      };
      setMyBids([...myBids, newBid]);
      setError(null);
      return newBid;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '竞价失败';
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [orders, myBids, currentUser]);

  const acceptBid = useCallback(async (bidId: string) => {
    setLoading(true);
    try {
      const bid = myBids.find(b => b.id === bidId);
      if (!bid) throw new Error('竞价不存在');

      const updatedOrders = orders.map(o => 
        o.id === bid.orderId 
          ? { ...o, status: '已接单' as const, contractorId: bid.contractorId, contractorName: bid.contractorName, finalPrice: bid.bidPrice }
          : o
      );
      setOrders(updatedOrders);
      setError(null);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '接受竞价失败';
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [orders, myBids]);

  const rejectBid = useCallback(async (bidId: string) => {
    setLoading(true);
    try {
      const filteredBids = myBids.filter(b => b.id !== bidId);
      setMyBids(filteredBids);
      setError(null);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '拒绝竞价失败';
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [myBids]);

  const completeOrder = useCallback(async (orderId: string, trackingData: any) => {
    setLoading(true);
    try {
      const updatedOrders = orders.map(o => 
        o.id === orderId 
          ? { ...o, status: '待验收' as const, trackingData }
          : o
      );
      setOrders(updatedOrders);
      setError(null);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '完成订单失败';
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [orders]);

  const inspectOrder = useCallback(async (orderId: string, approved: boolean, notes?: string) => {
    setLoading(true);
    try {
      const updatedOrders = orders.map(o => 
        o.id === orderId 
          ? { 
              ...o, 
              status: approved ? ('已完成' as const) : ('争议中' as const),
              inspection: {
                status: approved ? ('approved' as const) : ('rejected' as const),
                inspectedAt: new Date(),
                notes,
              }
            }
          : o
      );
      setOrders(updatedOrders);
      setError(null);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '验收订单失败';
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [orders]);

  const reviewOrder = useCallback(async (orderId: string, review: any) => {
    setLoading(true);
    try {
      const updatedOrders = orders.map(o => 
        o.id === orderId 
          ? { ...o, publisherReview: { ...review, createdAt: new Date() } }
          : o
      );
      setOrders(updatedOrders);
      setError(null);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '评价订单失败';
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [orders]);

  const submitCertification = useCallback(async (type: string, documentUrl: string) => {
    setLoading(true);
    try {
      const user = currentUser || currentUserData;
      const newCert: UserCertification = {
        id: `cert_${Date.now()}`,
        userId: user.id || '',
        type: type as any,
        status: '审核中',
        documentUrl,
        badges: [],
      };
      const updatedUser = {
        ...user,
        certifications: [...user.certifications, newCert],
      };
      setCurrentUser(updatedUser);
      setError(null);
      return newCert;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '提交认证失败';
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  const getCertifications = useCallback(async (userId: string) => {
    setLoading(true);
    try {
      const user = currentUser || currentUserData;
      return user?.certifications || [];
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '获取认证信息失败';
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  const searchOrders = useCallback(async (filters: any) => {
    setLoading(true);
    try {
      let filtered = orders.length > 0 ? orders : sampleOrders;
      if (filters.workType) {
        filtered = filtered.filter(o => o.workType === filters.workType);
      }
      if (filters.status) {
        filtered = filtered.filter(o => o.status === filters.status);
      }
      if (filters.area) {
        filtered = filtered.filter(o => o.area >= filters.area.min && o.area <= filters.area.max);
      }
      setError(null);
      return filtered;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '搜索订单失败';
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [orders]);

  const getLeaderboard = useCallback(async (workType?: string) => {
    setLoading(true);
    try {
      const data = leaderboard.length > 0 ? leaderboard : sampleLeaderboard;
      if (workType) {
        return data.filter(entry => entry.specialization === workType);
      }
      return data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '获取排行榜失败';
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [leaderboard]);

  const value: MarketplaceContextType = {
    // 正式运行：严格返回当前 state（空即空），避免回退到 sample 数据
    orders: isSimulateMode ? (orders.length > 0 ? orders : sampleOrders) : orders,
    myOrders: isSimulateMode ? (myOrders.length > 0 ? myOrders : sampleOrders.filter(o => o.publisherId === 'current_user')) : myOrders,
    availableOrders: isSimulateMode ? (availableOrders.length > 0 ? availableOrders : sampleOrders.filter(o => o.status === '待抢单')) : availableOrders,
    currentUser: isSimulateMode ? (currentUser || currentUserData) : currentUser,
    myBids,
    leaderboard: isSimulateMode ? (leaderboard.length > 0 ? leaderboard : sampleLeaderboard) : leaderboard,
    stats: isSimulateMode ? (stats.totalOrders > 0 ? stats : sampleStats) : stats,
    publishOrder,
    cancelOrder,
    placeBid,
    acceptBid,
    rejectBid,
    completeOrder,
    inspectOrder,
    reviewOrder,
    submitCertification,
    getCertifications,
    searchOrders,
    getLeaderboard,
    loading,
    error,
  };

  return (
    <MarketplaceContext.Provider value={value}>
      {children}
    </MarketplaceContext.Provider>
  );
}

export { sampleOrders, sampleLeaderboard, sampleStats, currentUserData };

export function useMarketplace() {
  const context = useContext(MarketplaceContext);
  if (!context) {
    throw new Error('useMarketplace must be used within MarketplaceProvider');
  }
  return context;
}

export default MarketplaceContext;
