# 2D Rig Lab

Desktop editor for modular 2D character rigs built with **Godot 4.x + GDScript**. It is independent from the game and lives inside the `3D-Analise` repository under `2D-Rig-Lab/`.

## Implemented

- Desktop editor layout with hierarchy, viewport, inspector and timeline.
- PNG import from filesystem.
- Project JSON save/open.
- Sprite transform editing: position, rotation, scale, pivot and Z index.
- Direct viewport selection and dragging.
- Zoom and pan.
- Hierarchical 2D bones with inherited position, rotation and scale.
- Sprite parts parented to bones.
- Sockets inheriting parent-bone transforms.
- Weapons following sockets automatically during animation.
- Cyclic bone-parent protection.
- Animation clips: Idle, Walk, Run, Attack, Hurt, Death, Skill and Berserk.
- Front, Back, Left and Right directions.
- 1–32 frame timeline with interpolated keyframes.
- Play, pause, stop, FPS and loop.
- Copy/paste/remove keyframes.
- Undo/redo for transform edits.
- Onion Skin preview: previous frame in blue and next frame in red. Shortcut: `O`.
- Skin Manager: create skins and replace individual piece PNGs without changing bones/keyframes.
- Active skin is stored in the project.
- Equipment Manager: register weapon PNGs, choose a socket, equip/swap/unequip in preview.
- Equipped weapon is stored in the project and does not require duplicated arm animations.
- Shortcuts: Ctrl+S, Ctrl+Z, Ctrl+Y, Space, Delete, F and O.

## Skin workflow

1. Create `Skin_Red`, `Skin_Blue`, `Skin_Armor`, etc. in the **SKINS & EQUIPAMENTOS** panel.
2. Select one body piece in the hierarchy/viewport.
3. Choose **Trocar PNG da peça nesta skin**.
4. Repeat only for the pieces that differ from the default skin.
5. Switch the active skin from the dropdown.

The replacement map uses the same piece IDs, so bones, sockets, keyframes and animations remain unchanged.

## Weapon workflow

1. Create a socket such as `RightHand` on the hand bone.
2. In **SKINS & EQUIPAMENTOS**, enter a weapon name and socket.
3. Register the transparent weapon PNG.
4. Equip any registered weapon from the dropdown.
5. Animate the hand/arm bones normally; the weapon follows automatically.

## Project format

The project JSON is currently format version 2 and stores active skin and equipped weapon in addition to pieces, bones, sockets, animations, keyframes, skins, weapons and effects.

## Folder layout

```text
2D-Rig-Lab/
├── project.godot
├── scenes/Main.tscn
├── scripts/
│   ├── core/
│   │   ├── rig_project.gd
│   │   └── editor_history.gd
│   ├── rig/
│   │   ├── rig_canvas.gd
│   │   └── rig_solver.gd
│   ├── project/project_store.gd
│   ├── skins/
│   │   ├── skin_data.gd
│   │   └── skin_manager.gd
│   ├── weapons/
│   │   ├── weapon_data.gd
│   │   └── weapon_manager.gd
│   ├── effects/effect_data.gd
│   ├── export/rig_exporter.gd
│   └── ui/
│       ├── main_editor.gd
│       └── asset_manager_panel.gd
└── README.md
```

## Running

1. Install Godot 4.x.
2. Open Godot Project Manager.
3. Import `2D-Rig-Lab/project.godot`.
4. Run the project.

No web server, Electron, Unity or game project is required.

## Next implementation order

1. Direction Mirror workflow (`Right -> Left`).
2. Effect tracks and effect preview controls.
3. Multi-key selection/move/duplicate improvements.
4. Individual PNG frame export.
5. Sprite-sheet renderer/exporter.
6. Later: IK, mesh deformation, constraints, curves, color animation and hitboxes.
