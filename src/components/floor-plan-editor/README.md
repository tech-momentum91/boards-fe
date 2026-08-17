# Floor plan editor SDK

Embed `FloorPlanEditor` anywhere; keep APIs, Redux, and association modals in the host.

## Quick usage

```jsx
import { FloorPlanEditor } from '@/components/floor-plan-editor';

<FloorPlanEditor
  image={{ url: floorPlanUrl, width: 4000, height: 3000 }}
  defaultAnnotations={[]}
  onAnnotationsChange={(next) => setAnnotations(next)}
  resetKey={layoutId}
  resolveAssociationLabel={(id) => spaceLabels[id]}
/>;
```

Preloaded `HTMLImageElement`:

```jsx
<FloorPlanEditor
  image={{ url: img.src, width: img.naturalWidth, height: img.naturalHeight, raster: img }}
  ...
/>
```

## Controlled mode

```jsx
<FloorPlanEditor
  image={...}
  annotations={annotations}
  onChange={(next) => dispatch(setAnnotations(next))}
  resetKey={layoutId}
/>
```

## Custom chrome

Use `renderToolbar` / `renderSidebar` with context from the default components, or omit for built-in glass UI.

See `docs/floor-plan-editor-sdk-architecture.md` for full extension points.
