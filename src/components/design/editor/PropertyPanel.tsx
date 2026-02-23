import { useDesignStore } from '../../../store/designStore';
import type { DesignObject, TextObject } from '../../../types/design';

export default function PropertyPanel() {
  const currentDesign = useDesignStore((s) => s.currentDesign);
  const selectedIds = useDesignStore((s) => s.selectedIds);
  const updateObject = useDesignStore((s) => s.updateObject);
  const pushUndo = useDesignStore((s) => s.pushUndo);

  if (!currentDesign || selectedIds.length !== 1) return null;

  const obj = currentDesign.objects.find((o) => o.id === selectedIds[0]);
  if (!obj) return null;

  const handleChange = (field: string, value: string | number) => {
    pushUndo();
    updateObject(obj.id, { [field]: value } as Partial<DesignObject>);
  };

  const isText = obj.type === 'text';
  const textObj = isText ? (obj as TextObject) : null;

  return (
    <div className="property-panel">
      <div className="property-panel-header">
        <span>속성</span>
        <span className="property-name">{obj.name}</span>
      </div>

      <div className="property-section">
        <div className="property-section-title">위치 & 크기</div>
        <div className="property-grid">
          <label>
            <span>X</span>
            <input
              type="number"
              value={Math.round(obj.x)}
              onChange={(e) => handleChange('x', Number(e.target.value))}
            />
          </label>
          <label>
            <span>Y</span>
            <input
              type="number"
              value={Math.round(obj.y)}
              onChange={(e) => handleChange('y', Number(e.target.value))}
            />
          </label>
          <label>
            <span>W</span>
            <input
              type="number"
              value={Math.round(obj.width)}
              onChange={(e) => handleChange('width', Number(e.target.value))}
            />
          </label>
          <label>
            <span>H</span>
            <input
              type="number"
              value={Math.round(obj.height)}
              onChange={(e) => handleChange('height', Number(e.target.value))}
            />
          </label>
        </div>
      </div>

      <div className="property-section">
        <div className="property-section-title">스타일</div>
        <div className="property-row">
          <label>
            <span>채우기</span>
            <div className="color-input-wrap">
              <input
                type="color"
                value={obj.fill === 'transparent' ? '#000000' : obj.fill}
                onChange={(e) => handleChange('fill', e.target.value)}
              />
              <input
                type="text"
                value={obj.fill}
                onChange={(e) => handleChange('fill', e.target.value)}
                className="color-text"
              />
            </div>
          </label>
        </div>
        <div className="property-row">
          <label>
            <span>테두리</span>
            <div className="color-input-wrap">
              <input
                type="color"
                value={obj.stroke === 'none' ? '#000000' : obj.stroke}
                onChange={(e) => handleChange('stroke', e.target.value)}
              />
              <input
                type="text"
                value={obj.stroke}
                onChange={(e) => handleChange('stroke', e.target.value)}
                className="color-text"
              />
            </div>
          </label>
        </div>
        {obj.cornerRadius !== undefined && (
          <div className="property-row">
            <label>
              <span>모서리</span>
              <input
                type="number"
                value={obj.cornerRadius}
                onChange={(e) => handleChange('cornerRadius', Number(e.target.value))}
              />
            </label>
          </div>
        )}
        <div className="property-row">
          <label>
            <span>불투명도</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={obj.opacity}
              onChange={(e) => handleChange('opacity', Number(e.target.value))}
            />
            <span className="property-value">{Math.round(obj.opacity * 100)}%</span>
          </label>
        </div>
      </div>

      {isText && textObj && (
        <div className="property-section">
          <div className="property-section-title">텍스트</div>
          <div className="property-row">
            <label>
              <span>내용</span>
              <input
                type="text"
                value={textObj.text}
                onChange={(e) => handleChange('text', e.target.value)}
              />
            </label>
          </div>
          <div className="property-grid">
            <label>
              <span>크기</span>
              <input
                type="number"
                value={textObj.fontSize}
                onChange={(e) => handleChange('fontSize', Number(e.target.value))}
              />
            </label>
            <label>
              <span>굵기</span>
              <select
                value={textObj.fontWeight}
                onChange={(e) => handleChange('fontWeight', e.target.value)}
              >
                <option value="normal">Regular</option>
                <option value="medium">Medium</option>
                <option value="bold">Bold</option>
              </select>
            </label>
          </div>
          <div className="property-row">
            <label>
              <span>색상</span>
              <div className="color-input-wrap">
                <input
                  type="color"
                  value={textObj.color}
                  onChange={(e) => handleChange('color', e.target.value)}
                />
                <input
                  type="text"
                  value={textObj.color}
                  onChange={(e) => handleChange('color', e.target.value)}
                  className="color-text"
                />
              </div>
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
