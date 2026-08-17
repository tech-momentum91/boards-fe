import React from 'react';
import { Hand, MousePointer2 } from 'lucide-react';

import { GlassPanel } from '@/components/floor-plan-editor/react/ui/glass-panel.jsx';
import { TOOL_IDS } from '@/components/floor-plan-editor/types/index.js';
import * as Button from '@/components/ui/button';
import * as Tooltip from '@/components/ui/tooltip';

function ToolButton({ active, label, onClick, children }) {
  return (
    <Button.Root
      type='button'
      size='small'
      variant={active ? 'primary' : 'neutral'}
      mode={active ? 'filled' : 'stroke'}
      aria-label={label}
      aria-pressed={active}
      title={label}
      onClick={onClick}
    >
      {children}
    </Button.Root>
  );
}

/**
 * Hand + Select toolbar for inline area picking on floor layouts.
 */
export default function ProjectAreaPickToolbar({ activeToolId, setActiveTool }) {
  return (
    <div className='pointer-events-none absolute bottom-3 left-1/2 z-30 flex w-full -translate-x-1/2 justify-center px-2'>
      <GlassPanel className='pointer-events-auto flex items-center gap-1 px-2 py-1.5'>
        <Tooltip.Root>
          <Tooltip.Trigger asChild>
            <ToolButton
              active={activeToolId === TOOL_IDS.HAND}
              label='Hand (H)'
              onClick={() => setActiveTool(TOOL_IDS.HAND)}
            >
              <Hand className='size-4 shrink-0' aria-hidden />
            </ToolButton>
          </Tooltip.Trigger>
          <Tooltip.Content>
            <p>Hand</p>
          </Tooltip.Content>
        </Tooltip.Root>

        <Tooltip.Root>
          <Tooltip.Trigger asChild>
            <ToolButton
              active={activeToolId === TOOL_IDS.SELECT}
              label='Select (V)'
              onClick={() => setActiveTool(TOOL_IDS.SELECT)}
            >
              <MousePointer2 className='size-4 shrink-0' aria-hidden />
            </ToolButton>
          </Tooltip.Trigger>
          <Tooltip.Content>
            <p>Select</p>
          </Tooltip.Content>
        </Tooltip.Root>
      </GlassPanel>
    </div>
  );
}
