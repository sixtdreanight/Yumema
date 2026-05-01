# UI 设计规范 (UI Design Spec)

## 核心设计语言

梦间 / Yumema 的 UI 建立在三种视觉语言之上：

| 语言 | 用途 | 视觉特征 |
|------|------|----------|
| **动画渐变背景** | 页面底层氛围 | `background-size: 400%` + `@keyframes shine` 缓慢移动 |
| **毛玻璃卡片** (glass-shine) | 内容容器、导航栏、对话框 | 半透明 + 强模糊 + 微弱边框 |
| **动画渐变卡片** (gradient-card) | 强调区域、状态提示 | 蓝-粉-紫渐变 + `@keyframes shine` + 内发光 |

## 一、双层嵌套模式 (Two-Layer Card Pattern)

**这是本项目最重要的 UI 规范。所有 glass-shine / gradient-card 容器都必须遵循此模式。**

### 规则

外层 div 负责视觉效果（毛玻璃/渐变），内层 div 负责 padding 和内容布局。**内容绝对不允许直接贴在外层容器上。**

### 正确示例

```tsx
{/* ✅ 正确：双层嵌套 */}
<div className="glass-shine rounded-2xl">
  <Flex direction="column" className="p-6">
    <Heading>标题</Heading>
    <Text>内容文字不会贴边</Text>
  </Flex>
</div>
```

```tsx
{/* ✅ 正确：双层嵌套 + 自定义 padding */}
<div className="glass-shine rounded-2xl">
  <Flex align="center" gap="4" style={{ padding: "10px 20px" }}>
    <Avatar />
    <Text>用户名</Text>
  </Flex>
</div>
```

### 错误示例

```tsx
{/* ❌ 错误：内容直接贴在外层容器上 */}
<div className="glass-shine rounded-2xl p-6">
  <Text>文字直接贴着玻璃容器边</Text>
</div>
```

### 为什么必须双层

1. **视觉呼吸感**：内容与容器边框需要足够间距（最少 12px）
2. **避免样式冲突**：外层负责视觉（blur/border/shadow），内层负责布局（padding/gap），职责分离
3. **一致性**：所有卡片统一遵循此模式，避免不同页面间距不一致

### 最小 Padding 标准

| 容器类型 | 最小 padding | 说明 |
|----------|-------------|------|
| 页面卡片 | `p-6` (24px) | 大内容区域 |
| 标题栏卡片 | `px-5` (20px) | 横向导航 |
| 按钮区域 | `px-5 py-2` | 紧凑操作区 |
| Tab 列表 | `p-1` (4px) | 仅作为 Trigger 的内边距 |

## 二、毛玻璃卡片 (glass-shine)

### 适用场景

- 聊天窗口标题栏卡片
- 消息输入框容器
- 设置对话框
- 导航栏
- 通用弹窗/Toast

### CSS 定义

```css
.glass-shine {
  background: rgba(255, 255, 255, 0.5);           /* 半透明白色 */
  backdrop-filter: blur(24px) saturate(160%);       /* 强模糊 + 饱和度 */
  -webkit-backdrop-filter: blur(24px) saturate(160%);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.3);     /* 微弱的白色边框 */
}

.dark .glass-shine {
  background: rgba(28, 28, 34, 0.7);               /* 深色半透明 */
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.08);
}
```

### 设计意图

模仿 macOS Dock 栏的毛玻璃效果：透明到能感知背景，模糊到不干扰阅读。避免过度透明导致元素叠加时文字难以辨认。

## 三、动画渐变卡片 (gradient-card)

### 适用场景

- 过渡/加载状态提示
- 关于页面/app 信息展示
- 重要内容强调

### CSS 定义

```css
.gradient-card {
  background: linear-gradient(
    135deg,
    rgba(87, 194, 255, 0.35) 0%,
    rgba(247, 112, 184, 0.35) 50%,
    rgba(140, 114, 235, 0.35) 100%
  );
  background-size: 200% 200%;
  animation: shine 4s infinite linear;
  border: 1px solid rgba(255, 255, 255, 0.4);
  box-shadow: inset 0 0 18px rgba(255, 255, 255, 0.6),
              0 4px 20px rgba(0, 0, 0, 0.08);
}
```

### 与 glass-shine 的选择

- **优先使用 glass-shine**：大部分内容容器
- **使用 gradient-card**：需要额外视觉强调的场景
- **不要嵌套使用**：gradient-card 内部不应再套 gradient-card

## 四、页面背景

### 动画渐变

所有页面使用 `background: transparent`，让 body 的动画渐变透出：

```css
body {
  background: linear-gradient(
    135deg,
    rgba(135, 206, 250, 0.35) 0%,    /* 浅蓝 */
    rgba(255, 182, 193, 0.35) 25%,   /* 浅粉 */
    rgba(216, 180, 254, 0.35) 50%,   /* 浅紫 */
    rgba(255, 182, 193, 0.35) 75%,
    rgba(135, 206, 250, 0.35) 100%
  ) fixed;
  background-size: 400% 400%;
  animation: shine 8s infinite linear;
}
```

### Radix Theme 穿透

Radix Themes `<Theme>` 组件默认设置 `background-color`，需要在全局样式覆盖：

```css
.radix-themes[data-is-root-theme] {
  background-color: transparent !important;
}
```

## 五、聊天气泡

### 统一毛玻璃风格

双方气泡使用相同的结构，仅颜色区分：

| 角色 | 背景色 | 文字色 |
|------|--------|--------|
| Partner (对方) | `rgba(255, 192, 203, 0.3)` 粉色调 | `var(--foreground)` |
| User (用户) | `rgba(147, 197, 253, 0.35)` 蓝色调 | `#1e293b` (light) / `#93c5fd` (dark) |

两者都使用：
- `backdrop-filter: blur(10px)` — 毛玻璃模糊
- `border: 1px solid rgba(255,255,255,0.3)` — 微弱边框
- `box-shadow: 0 1px 4px rgba(0,0,0,0.04)` — 微妙阴影

### 气泡形状

- Partner：`border-radius: 18px 18px 18px 4px`（左下小圆角，模仿 IM 气泡）
- User：`border-radius: 18px 18px 4px 18px`（右下小圆角）

## 六、颜色系统

### Token 层级

```
shadcn/ui CSS Variables (globals.css)
  └── V-Partner Design Tokens (别名)
        └── 组件内联样式
```

### 常用 Token

| Token | 用途 |
|-------|------|
| `var(--background)` | 页面背景色 |
| `var(--foreground)` | 主文字色 |
| `var(--primary)` | 主色调（粉色系） |
| `var(--muted-foreground)` | 次要文字 |
| `var(--border)` | 边框色 |
| `var(--secondary)` | 次要背景 |
| `--vp-primary-soft` | 浅色强调背景 |

### 规则

- **组件内永远使用 CSS 变量，不硬编码 hex**
- 亮色/暗色模式通过 `.dark` class 自动切换，无需在组件中判断

## 七、暗色模式

### 实现方式

暗色 class 加在 `<html>` 元素上：

```ts
document.documentElement.classList.toggle("dark", isDark);
```

### CSS 选择器规则

```css
/* ✅ 正确 */
.dark body { ... }
.dark .glass-shine { ... }

/* ❌ 错误 — dark class 不在 body 上 */
body.dark { ... }
```

### 暗色适配检查清单

每处 UI 变更后验证：
1. 所有文字在暗色下可读（对比度 ≥ 4.5:1）
2. 所有边框在暗色下可见
3. 毛玻璃效果在暗色下仍有层次感
4. 渐变在暗色下不过于刺眼

## 八、间距与字体

### 间距

- 使用 Radix Themes 的 `size` 属性（1-4）和 Tailwind `p-`/`m-` 类
- Tab trigger 最小 `px-4 py-2`
- 表单字段之间最小 `gap-2`

### 字体

- 主字体：`"Varela Round"` + 中文字体后备
- 等宽字体（时间戳等）：`"JetBrains Mono"` + 系统等宽
- 字号遵循 Radix Themes scale (1-9)

## 九、动画

| 动画 | 持续时间 | 缓动 | 用途 |
|------|----------|------|------|
| `fade-in` | 200ms | ease-out | 内容渐入 |
| `slide-up` | 350ms | spring | 消息气泡、弹窗 |
| `scale-in` | 350ms | spring | 对话框、状态卡片 |
| `bounce-in` | 500ms | spring | 首次加载 |
| `shine` | 8s | linear (循环) | 背景渐变 |
| `gradientFlow` | 3s | ease-in-out (循环) | 按钮渐变 |

## 十、图标

使用 `lucide-react` 图标库，统一 16-18px 尺寸：
- 按钮图标：16px
- 导航图标：18px
- 状态指示灯：12px

不引入 emoji 到代码中。
