# 吉林一号卫星地图 API 接口信息

## 服务地址
- 基础URL: `https://api.jl1mall.com/getMap/`
- 坐标系: Web Mercator (EPSG:3857)
- 协议: TMS / WMTS

## TMS协议加载方式

### OpenLayers / QGIS / Leaflet
```
https://api.jl1mall.com/getMap/{z}/{x}/{-y}?mk=图层MK&tk=套件TK&_pro=项目id
```

### Cesium
```
https://api.jl1mall.com/getMap/{z}/{x}/{reverseY}?mk=图层MK&tk=套件TK&_pro=项目id
```

### Mapbox
```
https://api.jl1mall.com/getMap/{z}/{x}/{y}?mk=图层MK&tk=套件TK&_pro=项目id
```

## 示例地址
```
https://api.jl1mall.com/getMap/{z}/{x}/{y}?mk=226bf902749f1630bc25fc720ba7c29f&tk=0073bbg5c4266498b8f18225fe63a3fa
```

## OpenLayers 代码示例
```javascript
let map = new ol.Map({
    target: 'map',
    layers: [
        new ol.layer.Tile({
            source: new ol.source.XYZ({
                projection: 'EPSG:3857',
                maxZoom: 18,
                minZoom: 0,
                url:'https://api.jl1mall.com/getMap/{z}/{x}/{-y}?mk=图层MK&tk=套件TK&pro=项目id'
            })
        })
    ],
    view: new ol.View({
        projection: 'EPSG:3857',
        center: ol.proj.fromLonLat([116.243, 40.042]),
        zoom: 10
    })
});
```

## 注意事项
- 需要在吉林一号网注册获取 mk (图层MK) 和 tk (套件TK)
- 企业版需要填写 _pro (项目id)
- 免费版有使用限制
