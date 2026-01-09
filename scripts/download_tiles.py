#!/usr/bin/env python3
"""
友谊农场20万亩区域卫星地图瓦片下载器
使用开源地图瓦片服务下载高清卫星图
"""

import os
import math
import time
import requests
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

# 区域配置 - 友谊农场20万亩
CONFIG = {
    'center_lat': 46.790,
    'center_lng': 131.720,
    'min_lat': 46.7380,
    'max_lat': 46.8420,
    'min_lng': 131.6440,
    'max_lng': 131.7960,
    'zoom_levels': [14, 15, 16, 17],  # 缩放级别
    'output_dir': '../public/tiles',
}

# 瓦片服务源 - 使用多个备用源
TILE_SOURCES = {
    # ArcGIS World Imagery - 高质量卫星图
    'arcgis': 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    # Google Satellite
    'google': 'https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
    # Bing Satellite (需要特殊处理)
    'esri': 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
}

def lat_lng_to_tile(lat, lng, zoom):
    """将经纬度转换为瓦片坐标"""
    n = 2 ** zoom
    x = int((lng + 180) / 360 * n)
    y = int((1 - math.log(math.tan(math.radians(lat)) + 1/math.cos(math.radians(lat))) / math.pi) / 2 * n)
    return x, y

def get_tile_bounds(zoom):
    """获取指定缩放级别的瓦片范围"""
    x_min, y_max = lat_lng_to_tile(CONFIG['min_lat'], CONFIG['min_lng'], zoom)
    x_max, y_min = lat_lng_to_tile(CONFIG['max_lat'], CONFIG['max_lng'], zoom)
    return x_min, x_max, y_min, y_max

def download_tile(z, x, y, source='arcgis', output_dir=None):
    """下载单个瓦片"""
    if output_dir is None:
        output_dir = CONFIG['output_dir']
    
    # 创建目录
    tile_dir = Path(output_dir) / str(z) / str(x)
    tile_dir.mkdir(parents=True, exist_ok=True)
    
    tile_path = tile_dir / f"{y}.png"
    
    # 如果已存在则跳过
    if tile_path.exists():
        return True, f"Skip {z}/{x}/{y}"
    
    # 构建URL
    url = TILE_SOURCES[source].format(z=z, x=x, y=y)
    
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Referer': 'https://www.arcgis.com/',
        }
        response = requests.get(url, headers=headers, timeout=30)
        
        if response.status_code == 200:
            with open(tile_path, 'wb') as f:
                f.write(response.content)
            return True, f"Downloaded {z}/{x}/{y}"
        else:
            return False, f"Failed {z}/{x}/{y}: HTTP {response.status_code}"
    except Exception as e:
        return False, f"Error {z}/{x}/{y}: {str(e)}"

def download_all_tiles(source='arcgis', max_workers=8):
    """下载所有瓦片"""
    output_dir = Path(CONFIG['output_dir'])
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # 收集所有需要下载的瓦片
    tiles = []
    for zoom in CONFIG['zoom_levels']:
        x_min, x_max, y_min, y_max = get_tile_bounds(zoom)
        for x in range(x_min, x_max + 1):
            for y in range(y_min, y_max + 1):
                tiles.append((zoom, x, y))
    
    total = len(tiles)
    print(f"总共需要下载 {total} 个瓦片")
    print(f"使用源: {source}")
    print(f"输出目录: {output_dir.absolute()}")
    print("-" * 50)
    
    downloaded = 0
    failed = 0
    skipped = 0
    
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = {
            executor.submit(download_tile, z, x, y, source, str(output_dir)): (z, x, y)
            for z, x, y in tiles
        }
        
        for future in as_completed(futures):
            success, msg = future.result()
            if success:
                if "Skip" in msg:
                    skipped += 1
                else:
                    downloaded += 1
            else:
                failed += 1
                print(msg)
            
            # 进度显示
            done = downloaded + failed + skipped
            if done % 100 == 0 or done == total:
                print(f"进度: {done}/{total} (下载: {downloaded}, 跳过: {skipped}, 失败: {failed})")
    
    print("-" * 50)
    print(f"完成! 下载: {downloaded}, 跳过: {skipped}, 失败: {failed}")
    
    # 计算总大小
    total_size = sum(f.stat().st_size for f in output_dir.rglob('*.png'))
    print(f"总大小: {total_size / 1024 / 1024:.2f} MB")

def generate_tile_index():
    """生成瓦片索引JSON文件"""
    output_dir = Path(CONFIG['output_dir'])
    
    index = {
        'center': [CONFIG['center_lng'], CONFIG['center_lat']],
        'bounds': [
            [CONFIG['min_lng'], CONFIG['min_lat']],
            [CONFIG['max_lng'], CONFIG['max_lat']]
        ],
        'minZoom': min(CONFIG['zoom_levels']),
        'maxZoom': max(CONFIG['zoom_levels']),
        'tileSize': 256,
        'format': 'png',
        'tiles': {}
    }
    
    for zoom in CONFIG['zoom_levels']:
        x_min, x_max, y_min, y_max = get_tile_bounds(zoom)
        index['tiles'][str(zoom)] = {
            'x': [x_min, x_max],
            'y': [y_min, y_max],
            'count': (x_max - x_min + 1) * (y_max - y_min + 1)
        }
    
    import json
    with open(output_dir / 'index.json', 'w') as f:
        json.dump(index, f, indent=2)
    
    print(f"索引文件已生成: {output_dir / 'index.json'}")

if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser(description='下载友谊农场卫星地图瓦片')
    parser.add_argument('--source', default='arcgis', choices=list(TILE_SOURCES.keys()),
                        help='瓦片源 (默认: arcgis)')
    parser.add_argument('--workers', type=int, default=8,
                        help='并发下载数 (默认: 8)')
    parser.add_argument('--index-only', action='store_true',
                        help='仅生成索引文件')
    
    args = parser.parse_args()
    
    if args.index_only:
        generate_tile_index()
    else:
        download_all_tiles(source=args.source, max_workers=args.workers)
        generate_tile_index()
