import { Eye, EyeOff, Lock, Unlock, Square, Type, Circle, Minus, Layers } from 'lucide-react';
import { useDesignStore } from '../../../store/designStore';
import type { DesignObject } from '../../../types/design';

const TYPE_ICONS: Record<string, typeof Square> = {
  rect: Square,
  text: Type,
  ellipse: Circle,
  line: Minus,
  group: Layers,
};

export default function LayerPanel() {
  const currentDesign = useDesignStore((s) => s.currentDesign);
  const selectedIds = useDesignStore((s) => s.selectedIds);
  const setSelectedIds = useDesignStore((s) => s.setSelectedIds);
  const updateObject = useDesignStore((s) => s.updateObject);

  if (!currentDesign) return null;

  const handleSelect = (id: string, e: React.MouseEvent) => {
    if (e.shiftKey) {
      // Multi-select
      setSelectedIds(
        selectedIds.includes(id)
          ? selectedIds.filter((sid) => sid !== id)
          : [...selectedIds, id],
      );
    } else {
      setSelectedIds([id]);
    }
  };

  const toggleVisibility = (obj: DesignObject, e: React.MouseEvent) => {
    e.stopPropagation();
    updateObject(obj.id, { visible: !obj.visible } as Partial<DesignObject>);
  };

  const toggleLock = (obj: DesignObject, e: React.MouseEvent) => {
    e.stopPropagation();
    updateObject(obj.id, { locked: !obj.locked } as Partial<DesignObject>);
  };

  return (
    <div className="layer-panel">
      <div className="layer-panel-header">
        <Layers size={14} />
        <span>레이어</span>
        <span className="layer-count">{currentDesign.objects.length}</span>
      </div>
      <div className="layer-list">
        {[...currentDesign.objects].reverse().map((obj) => {
          const Icon = TYPE_ICONS[obj.type] || Square;
          const isSelected = selectedIds.includes(obj.id);

          return (
            <div
              key={obj.id}
              className={`layer-item ${isSelected ? 'selected' : ''} ${!obj.visible ? 'hidden-layer' : ''}`}
              onClick={(e) => handleSelect(obj.id, e)}
            >
              <Icon size={12} className="layer-type-icon" />
              <span className="layer-name">{obj.name}</span>
              {obj.sindriMeta?.semanticRole && (
                <span className="layer-role">{obj.sindriMeta.semanticRole}</span>
              )}
              <button
                className="layer-action"
                onClick={(e) => toggleVisibility(obj, e)}
                title={obj.visible ? '숨기기' : '표시'}
              >
                {obj.visible ? <Eye size={11} /> : <EyeOff size={11} />}
              </button>
              <button
                className="layer-action"
                onClick={(e) => toggleLock(obj, e)}
                title={obj.locked ? '잠금 해제' : '잠금'}
              >
                {obj.locked ? <Lock size={11} /> : <Unlock size={11} />}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
