export function labelCacheKey({ displayName = '', statusText = '', statusColor = '' }) {
    return `${displayName ?? ''}|${statusText ?? ''}|${statusColor ?? ''}`;
}

export class LabelRegistry {
    constructor(getFactory, onChange) {
        this.getFactory = getFactory;
        this.onChange = onChange;
        this.sprites = new Map();
    }

    add(id, sprite) {
        const previous = this.sprites.get(id);
        if (previous && previous !== sprite) {
            previous.material?.map?.dispose();
            previous.material?.dispose();
        }
        this.sprites.set(id, sprite);
    }

    update(id, statusText, statusColor) {
        const sprite = this.sprites.get(id);
        if (!sprite?.material?.map) return;
        const displayName = sprite.userData.baseDisplayName ?? sprite.userData.displayName;
        const params = { displayName, statusText: statusText ?? null, statusColor: statusColor ?? null };
        const factory = this.getFactory();
        const key = labelCacheKey(params);
        if (sprite.userData.labelKey === key) return;
        const { canvas, texture } = factory.getLabelTexture(params);
        sprite.userData.labelKey = key;
        sprite.material.map.dispose();
        sprite.material.map = texture;
        sprite.material.needsUpdate = true;
        sprite.scale.set(canvas.width * 0.05, canvas.height * 0.05, 1);
        this.onChange();
    }

    dispose() {
        this.sprites.forEach((sprite) => {
            sprite.material?.map?.dispose();
            sprite.material?.dispose();
        });
        this.sprites.clear();
    }
}
