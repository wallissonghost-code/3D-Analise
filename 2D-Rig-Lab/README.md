# 2D Rig Lab

Desktop editor for modular 2D character rigs built with **Godot 4.x + GDScript**. It is independent from the game and lives inside the `3D-Analise` repository under `2D-Rig-Lab/`.

## MVP implemented

- Desktop editor layout with hierarchy, viewport, inspector and timeline.
- PNG import from filesystem.
- Project JSON save/open.
- Sprite part transform editing: position, rotation, scale, pivot, Z index.
- Direct viewport selection and dragging.
- Zoom with mouse wheel and pan with middle mouse button.
- Bone hierarchy with inherited position, rotation and scale.
- Sprite parts can be parented to bones and inherit their transforms.
- Sockets inherit their parent bone transform.
- Parts/weapons attached to sockets follow the socket automatically during animation.
- Cyclic bone-parent protection in the runtime solver.
- Animation clips: Idle, Walk, Run, Attack, Hurt, Death, Skill, Berserk.
- Directions: Front, Back, Left, Right.
- 1–32 frame timeline.
- Transform keyframes and interpolation between keys.
- Play/pause/stop, FPS and loop.
- Copy/paste/remove keyframes.
- Undo/redo for transform edits.
- Shortcuts: Ctrl+S, Ctrl+Z, Ctrl+Y, Space, Delete, F.
- Modular extension points for skins, weapons, effects and exporters.

## Current rig workflow

1. Import the transparent PNG body parts.
2. Create bones and set each bone's parent in the inspector.
3. Parent a sprite part to the appropriate bone.
4. Create a socket while the hand bone is selected, for example `RightHand`.
5. Select the weapon part, type `RightHand` in Socket and use the attach action.
6. Keyframe the arm/hand bones. Child parts and the weapon now inherit the animated hierarchy.

The rig solver evaluates local transforms into world transforms every preview frame. This keeps animation data reusable: changing the weapon PNG does not require recreating arm keyframes.

## Remaining planned increments

- Onion skin and multi-key drag selection.
- Horizontal direction mirroring (Right -> Left).
- Full skin manager and equipment library UI.
- Effect tracks and effect preview controls.
- Individual PNG frame and sprite-sheet rendering/export.
- IK, mesh deformation, constraints, curves, color animation and hitboxes are future architecture targets.

## Folder layout

```text
2D-Rig-Lab/
├── project.godot
├── scenes/
│   └── Main.tscn
├── scripts/
│   ├── core/
│   │   ├── rig_project.gd
│   │   └── editor_history.gd
│   ├── rig/
│   │   ├── rig_canvas.gd
│   │   └── rig_solver.gd
│   ├── project/
│   │   └── project_store.gd
│   ├── skins/
│   │   └── skin_data.gd
│   ├── weapons/
│   │   └── weapon_data.gd
│   ├── effects/
│   │   └── effect_data.gd
│   ├── export/
│   │   └── rig_exporter.gd
│   └── ui/
│       └── main_editor.gd
└── README.md
```

## Running

1. Install Godot 4.x.
2. Open Godot Project Manager.
3. Import `2D-Rig-Lab/project.godot`.
4. Run the project.

No web server, Electron, Unity or game project is required.

## Project format

A saved project is a JSON file. After the first save, imported sprites are copied into a sibling `sprites/` folder when possible. The JSON stores pieces, transform/pivot data, bones, sockets, animations, keyframes, skins, weapons and effects.

Suggested working layout:

```text
MyCharacter/
├── character.json
├── sprites/
├── animations/
└── exports/
```

## Next implementation order

1. Onion skin preview.
2. Skin manager and equipment preview/library.
3. Direction mirror workflow.
4. Effect tracks.
5. Individual PNG and sprite-sheet renderer/exporter.
