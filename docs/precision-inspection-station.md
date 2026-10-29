# Precision Inspection Station

## Asset scope

`Precision Inspection Station`（精密工业检测工作站）是 GallivantSoft Interactive Lab 的原创工业设备资产。它作为独立资产交付，当前没有接入网站导航，也没有替换 Digital Operations Twin 的既有模型或工作流。

设计尺寸采用米制单位，整体约为 `4.33 m × 2.34 m × 2.96 m`。造型语言以深石墨灰的倒角机柜、银色结构件、哑光黑检修区和少量科技蓝/青绿色状态光为主，避免科幻化和高饱和塑料感。

## Deliverables

- Web 模型：`assets/models/precision-inspection-station.glb`
- Blender 源文件：`assets/models/source/precision-inspection-station.blend`
- 参数化生成脚本：`scripts/blender/build-inspection-station.py`
- GLB 回导验证脚本：`scripts/blender/validate-inspection-station.py`
- 源场景统计：`assets/models/precision-inspection-station.report.json`
- GLB 回导统计：`assets/models/precision-inspection-station.validation.json`
- 真实渲染图：`assets/renders/precision-inspection-station/`

资产不依赖外部模型、外部贴图、字体文件或其他本地资源。所有几何、材质、灯光和渲染视角均由生成脚本创建。

## Component hierarchy

```text
PrecisionInspectionStation
├── MainChassis
├── InspectionChamber
├── OpticalAssembly
├── ConveyorAssembly
├── ControlModule
├── CoolingAssembly
├── MechanicalConnections
└── CableAssembly
```

主要组件均为根节点下的独立子层级，零件保持独立对象，便于下一阶段选择、隔离和爆炸拆解。原始状态为完整装配状态；本阶段没有加入拆解动画。

### MainChassis

自定义挤出轮廓构成左右塔身、底座和顶部桥架，配合倒角、层叠蒙皮、前后检修门、右侧独立检修面板、嵌入式把手、铰链、通风百叶和受控数量的紧固件。主体轮廓不是未经处理的普通长方体。

### InspectionChamber

独立金属立柱、上下横梁、透明安全玻璃、内部背板、门把手、铰链及内部检查灯共同构成可观察检测舱。

### OpticalAssembly

包括龙门梁、双安装支架、调节滑座、相机壳体、多级镜头、对焦环、环形检测灯和调节旋钮。圆形光学几何和安装关系在近景中可辨认。

### ConveyorAssembly

由 19 根独立滚轴、两侧轴承、导轨、导轨嵌件、四根横向支撑、驱动轮和橡胶轮缘组成，没有使用整块长方体代替传送机构。

### ControlModule

独立斜面控制壳体包含屏幕边框、屏幕玻璃、状态 UI 几何、三个按键、旋转编码器和急停按钮。

### CoolingAssembly

后部双风扇分别包含凹槽、外圈、轮毂、七片扇叶、双层护网和护网支杆；中央风道使用有厚度的百叶结构。

### MechanicalConnections

包含可调平脚、脚杆、面板紧固件、舱体角件、线缆接头和状态塔灯。紧固件只放置在结构或检修面板需要的位置。

### CableAssembly

三条 Bezier 曲线线缆分别连接光学组件、控制模块和散热供电端，另有独立固定夹。路径具有明确起止点，不穿过主体外壳。

## Materials

| Material | Purpose | Surface character |
| --- | --- | --- |
| `PaintedMetal_Graphite` | 主机架 | 深石墨喷涂金属，中等粗糙度 |
| `PaintedMetal_MidGraphite` | 检修柜与模块壳体 | 略浅喷涂金属 |
| `BrushedMetal` | 框架、滚轴、旋钮与装饰边 | 高金属度、细微程序化拉丝凹凸 |
| `DarkStructuralMetal` | 导轨、边框、护网与支架 | 哑光黑结构金属 |
| `IndustrialRubber` | 脚垫与驱动轮缘 | 高粗糙度非金属 |
| `SafetyGlass` | 检测舱窗口 | 低粗糙度、半透明安全玻璃 |
| `OpticalLens` | 镜头组 | 深色低粗糙度透射材质 |
| `ControlScreen` | 控制屏 | 低粗糙度深色屏幕，轻微自发光 |
| `TechnologyBlue` | 导轨嵌件 | 低饱和科技蓝金属 |
| `StatusCyan` / `StatusGreen` | 检查灯与状态灯 | 受控面积的自发光材质 |
| `EmergencyRed` | 急停按钮 | 仅用于安全操作件 |
| `InspectionWhite` | 舱内背板 | 浅色金属反射面 |
| `CableRubber` | 线缆 | 哑光黑橡胶 |

材质可复用且不包含高分辨率贴图。Blender 产品渲染保留程序化拉丝效果；无贴图 GLB 在不同实时渲染器中的微表面表现可能略有不同。

## Model statistics

| Metric | Result |
| --- | ---: |
| Blender version | 5.2.3 LTS |
| Render engine | Eevee |
| Units | metres |
| Source mesh objects | 200 |
| Source evaluated triangles | 74,556 |
| GLB round-trip mesh objects | 206 |
| GLB round-trip triangles | 115,140 |
| Triangle budget | < 200,000 (pass) |
| GLB size | 4,039,520 bytes (about 3.85 MiB) |
| Blend size | 283,969 bytes (about 277 KiB) |
| External dependencies | none |

GLB 三角面数高于 Blender 源场景的 evaluated 统计，是因为 glTF 导出会三角化曲线、文本、N-gon 和部分修改器结果。部署模型仍低于首版 20 万三角面预算。

## Rebuild and validate

在仓库根目录运行：

```powershell
& 'D:\blender\blender.exe' --background --factory-startup --python scripts/blender/build-inspection-station.py
& 'D:\blender\blender.exe' --background --factory-startup --python scripts/blender/validate-inspection-station.py
```

第一条命令重建 `.blend`、`.glb`、统计文件及五张渲染图。第二条命令在空白 Blender 场景中重新导入 GLB，检查根节点、八个主要组件、三角面预算、尺寸，以及是否意外导出了产品展示用相机或灯光。

## Render views

- `front-view.png`：正面完整组装状态，可见光学组件、舱体与控制模块。
- `side-view.png`：右侧检修面板、百叶、把手、铰链、紧固件和线缆路径。
- `three-quarter-view.png`：主要产品验收视角，展示完整轮廓、材料分区与装配关系。
- `rear-view.png`：后部双风扇、真实扇叶、护网、中央检修门和风道百叶。
- `close-up-detail-view.png`：控制台、透明检测舱、环形光源和滚轴近景。

预览资产时可直接打开 `.blend` 查看产品摄影棚，也可在 Blender、Three.js Editor 或任意支持 glTF 2.0 的查看器中加载 GLB。GLB 不包含摄影棚地面、背景、相机或灯光，便于未来在独立 Three.js 预览页中自行布光。

## Known limitations

- 本阶段没有拆解动画、零件选择、隔离或重组交互。
- 模型尚未接入现有 Digital Operations Twin，也没有加入正式网站导航。
- 玻璃和程序化拉丝金属在 Three.js 等实时引擎中需要依据目标色调映射、环境贴图和透明排序做最终材质校准。
- 控制屏内容为建模几何，不是可交互 UI。
- Eevee 安全玻璃会呈现轻微的采样颗粒；源模型几何和透明层级本身保持完整。

## Next-phase readiness

根节点和八个主要组件采用稳定名称，重要零件保持独立、父子关系清晰，GLB 回导后层级仍然存在。下一阶段可围绕这些组件增加 `Component Selection`、`Exploded View`、`Isolate Component` 和 `Reassemble`，无需在本阶段修改现有网站工作流。
