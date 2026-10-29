# Precision Inspection Station

## Asset scope

`Precision Inspection Station`（精密工业检测工作站）是 GallivantSoft Interactive Lab 的原创工业设备资产。资产现已接入独立的三语交互式装配浏览器，但没有替换 Digital Operations Twin 的既有模型或工作流。

设计尺寸采用米制单位，整体约为 `4.33 m × 2.34 m × 2.96 m`。造型语言以深石墨灰的倒角机柜、银色结构件、哑光黑检修区和少量科技蓝/青绿色状态光为主，避免科幻化和高饱和塑料感。

## Deliverables

- Web 模型：`assets/models/precision-inspection-station.glb`
- Blender 源文件：`assets/models/source/precision-inspection-station.blend`
- 参数化生成脚本：`scripts/blender/build-inspection-station.py`
- GLB 回导验证脚本：`scripts/blender/validate-inspection-station.py`
- 源场景统计：`assets/models/precision-inspection-station.report.json`
- GLB 回导统计：`assets/models/precision-inspection-station.validation.json`
- 真实渲染图：`assets/renders/precision-inspection-station/`
- 浏览器交互验收图：`docs/screenshots/inspection-station/`

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

主要组件均为根节点下的独立子层级，零件保持独立对象。浏览器装配浏览器将这八组作为主要选择层级，并额外从稳定节点名组织五个精选细节组：光学镜头、检测头、滚轴组、控制面板和双风扇。原始状态保持完整装配。

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

预览资产时可直接打开 `.blend` 查看产品摄影棚，也可在本地开发服务中打开 `/en/showcase/inspection-station/`（另有 `/zh/`、`/ms/` 对应路径）。网页先显示 `three-quarter-view.png`，用户主动启动后才下载 GLB。GLB 不包含摄影棚地面、背景、相机或灯光；浏览器使用本地 `RoomEnvironment`、PMREM、产品布光、接触阴影、ACES 色调映射和正确色彩空间完成实时展示。

## Interactive explorer architecture

- `component-registry.js`：验证八个顶层组件，建立网格到主要组件/精选细节组的映射，并保存父节点、局部位置、旋转、缩放和矩阵快照。
- `selection-controller.js`：用 Raycaster 处理点击与拖动阈值，透明材质降权；高亮通过克隆运行时材质与 `Box3Helper` 实现，不修改 GLB 共享 PBR 材质。HTML 标签每帧从所选包围盒锚点投影到屏幕，并限制在可视边界内。
- `assembly-controller.js`：按设备结构使用预设方向、距离、延迟和缓动拆分前舱、传送、光学、控制、散热、连接和线缆组件；重组始终以原始快照为终点，并支持动画中途反向。
- `camera-controller.js`：根据所选对象或完整装配的包围球、视场角和画布宽高比计算相机距离，提供平滑聚焦、产品固定视角和用户操作中断。
- `animation-scheduler.js`：统一相机与装配动画的 RAF；无动画/无交互时按需渲染，页面隐藏时停止，卸载时释放事件、几何、材质、环境贴图和渲染器。

### Animation timing

`AnimationScheduler` 是装配和摄像机动画唯一的时间来源。每个新任务（包括覆盖同名旧任务）的首帧固定获得 `delta = 0`，后续只接收 RAF 单调时钟产生的非负增量；单帧最大增量限制为 `64 ms`，避免低帧率或主线程短暂停顿造成明显跳跃。标签页隐藏时会取消 RAF 并清空时间基准，重新显示后的第一帧仍为零增量，因此隐藏期间的时间不会被补算到动画中。

普通模式的完整拆解时间为 `2200 ms`，完整重组为 `1800 ms`。各组件保留既有结构化延迟与三次缓入缓出曲线。动画中途反向时，控制器以每个组件当前局部位置为新起点，并按“当前位置到目标位置 / 完整爆炸偏移”的最大比例缩短时长，最低保留 `260 ms`；不会先跳到前一方向终点。相机聚焦、爆炸构图、复位和固定视角分别使用 `820 / 1100 / 760 / 680 ms` 的平滑过渡。OrbitControls 的手动操作会终止当前相机任务；未启用持续阻尼，以保留静止状态下的按需渲染。

`scripts/validate-inspection-station-animation.mjs` 使用可控 RAF 和可控页面可见性运行真实控制器，验证首帧、连续帧、长帧上限、任务覆盖、60 FPS 中段、30 FPS 八轮往返、40% 中途反向、隐藏/恢复、摄像机中段与手动中断、reduced-motion 和卸载取消。

隔离不会重新挂接网格：控制器仅保存并切换主要组件的可见性，恢复完整装配时还原全部层级。精选细节组隔离时保留其所属主要组件，但只显示该组登记的网格。这样不会破坏 GLB 父子关系或后续重组坐标。

### Browser validation

真实 Chrome 验收覆盖延迟加载、射线选择、标签跟随、聚焦、隔离、完整拆解/重组、动画中途反向、四个产品视角、语言切换、390px/768px 触控布局及 WebGL 禁用降级。最终硬件渲染时序复验测得完整拆解约 `2264 ms`、完整重组约 `2018 ms`，在 `120 ms` 与 `900 ms` 均仍处于拆解过程；约 40% 时反向在约 `610 ms` 平滑返回。GLB 在启动前请求数为 0，启动后仅请求 1 次；八个组件均由运行时层级检查确认，控制台无 error。计时记录为 `animation-timing-qa.json`，中间帧使用 `timing-00-explode-120ms.png` 与 `timing-00-explode-900ms.png`。

## Known limitations

- 当前精选交互粒度为八个主要组件和五个有展示价值的细节组；其余网格仍可随所属组件选择，但不会全部成为独立控制项。
- 模型没有接入现有 Digital Operations Twin；它作为 Showcase 中的独立作品和独立路由保留。
- 浏览器端无贴图 GLB 无法完全复现 Blender 程序化拉丝微表面与 Eevee 采样；实时材质经过非破坏性校准，源 GLB 未修改。
- 控制屏内容为建模几何，不是可交互 UI。
- Eevee 安全玻璃会呈现轻微的采样颗粒；源模型几何和透明层级本身保持完整。

## Transform and extension readiness

根节点、八个主要组件与代表性子零件采用稳定名称，重要零件保持独立、父子关系清晰，GLB 回导后层级仍然存在。交互层通过注册表定义展示语义和拆解计划，不改写模型文件；未来如需增加更多重点零件，只需扩展细节组、技术文案与经过视觉验证的拆解路径。
