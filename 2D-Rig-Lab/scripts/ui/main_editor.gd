extends Control

const RigProjectClass = preload("res://scripts/core/rig_project.gd")
const ProjectStoreClass = preload("res://scripts/project/project_store.gd")
const HistoryClass = preload("res://scripts/core/editor_history.gd")
const RigCanvasClass = preload("res://scripts/rig/rig_canvas.gd")

var project: RigProject
var history: EditorHistory
var canvas: RigCanvas
var hierarchy: Tree
var inspector_title: Label
var pos_x: SpinBox
var pos_y: SpinBox
var rotation_box: SpinBox
var scale_x: SpinBox
var scale_y: SpinBox
var pivot_x: SpinBox
var pivot_y: SpinBox
var z_box: SpinBox
var bone_parent: OptionButton
var socket_box: LineEdit
var frame_label: Label
var timeline_row: HBoxContainer
var fps_box: SpinBox
var anim_name: OptionButton
var direction: OptionButton
var loop_check: CheckBox
var play_button: Button
var status: Label
var import_dialog: FileDialog
var open_dialog: FileDialog
var save_dialog: FileDialog
var current_frame := 1
var selected_kind := ""
var selected_id := ""
var playing := false
var playback_frame := 1.0
var clipboard_key: Dictionary = {}
var _updating_inspector := false

func _ready() -> void:
	project = RigProjectClass.new()
	history = HistoryClass.new()
	build_ui()
	bind_shortcuts()
	refresh_all()

func build_ui() -> void:
	var root := VBoxContainer.new()
	root.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	root.add_theme_constant_override("separation", 0)
	add_child(root)

	root.add_child(build_toolbar())

	var main_split := HSplitContainer.new()
	main_split.size_flags_vertical = Control.SIZE_EXPAND_FILL
	main_split.split_offset = 260
	root.add_child(main_split)

	main_split.add_child(build_left_panel())
	var center_right := HSplitContainer.new()
	center_right.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	center_right.split_offset = 900
	main_split.add_child(center_right)

	var center := VBoxContainer.new()
	center.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	center.size_flags_vertical = Control.SIZE_EXPAND_FILL
	center_right.add_child(center)
	center.add_child(build_viewport_toolbar())
	canvas = RigCanvasClass.new()
	canvas.custom_minimum_size = Vector2(640, 420)
	canvas.size_flags_vertical = Control.SIZE_EXPAND_FILL
	canvas.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	canvas.item_selected.connect(_on_canvas_selected)
	canvas.item_transform_changed.connect(_on_canvas_transform_changed)
	center.add_child(canvas)
	center.add_child(build_timeline())

	center_right.add_child(build_inspector())

	status = Label.new()
	status.text = "Pronto · 2D Rig Lab MVP"
	status.add_theme_color_override("font_color", Color("#9ba8bd"))
	status.custom_minimum_size.y = 26
	root.add_child(status)

	build_dialogs()

func build_toolbar() -> Control:
	var bar := HBoxContainer.new()
	bar.custom_minimum_size.y = 50
	bar.add_theme_constant_override("separation", 7)
	_add_button(bar, "New Project", new_project)
	_add_button(bar, "Open Project", open_project)
	_add_button(bar, "Save", save_project)
	_add_button(bar, "Import PNG", import_png)
	_add_button(bar, "Export JSON", export_json)
	_add_separator(bar)
	_add_button(bar, "Undo", undo)
	_add_button(bar, "Redo", redo)
	_add_separator(bar)
	play_button = _add_button(bar, "▶ Play", toggle_play)
	_add_button(bar, "■ Stop", stop_playback)
	_add_button(bar, "Preview", focus_selected)
	return bar

func build_left_panel() -> Control:
	var panel := VBoxContainer.new()
	panel.custom_minimum_size.x = 260
	var title := Label.new()
	title.text = "HIERARQUIA"
	panel.add_child(title)
	var actions := HBoxContainer.new()
	_add_button(actions, "+ Bone", add_bone)
	_add_button(actions, "+ Socket", add_socket)
	panel.add_child(actions)
	hierarchy = Tree.new()
	hierarchy.hide_root = true
	hierarchy.size_flags_vertical = Control.SIZE_EXPAND_FILL
	hierarchy.item_selected.connect(_on_tree_selected)
	panel.add_child(hierarchy)
	var help := Label.new()
	help.text = "LMB: selecionar/arrastar peça\nMMB: pan · Scroll: zoom\nF: focar selecionado"
	help.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	help.add_theme_color_override("font_color", Color("#778398"))
	panel.add_child(help)
	return panel

func build_viewport_toolbar() -> Control:
	var bar := HBoxContainer.new()
	var grid := CheckBox.new(); grid.text = "Grade"; grid.button_pressed = true
	grid.toggled.connect(func(v): if canvas: canvas.show_grid = v; canvas.queue_redraw())
	bar.add_child(grid)
	var bones := CheckBox.new(); bones.text = "Bones"; bones.button_pressed = true
	bones.toggled.connect(func(v): if canvas: canvas.show_bones = v; canvas.queue_redraw())
	bar.add_child(bones)
	var sockets := CheckBox.new(); sockets.text = "Sockets"; sockets.button_pressed = true
	sockets.toggled.connect(func(v): if canvas: canvas.show_sockets = v; canvas.queue_redraw())
	bar.add_child(sockets)
	var pivots := CheckBox.new(); pivots.text = "Pivôs"; pivots.button_pressed = true
	pivots.toggled.connect(func(v): if canvas: canvas.show_pivots = v; canvas.queue_redraw())
	bar.add_child(pivots)
	return bar

func build_inspector() -> Control:
	var panel := VBoxContainer.new()
	panel.custom_minimum_size.x = 300
	inspector_title = Label.new(); inspector_title.text = "PROPRIEDADES"
	panel.add_child(inspector_title)
	pos_x = _spin(panel, "Posição X", -10000, 10000, 1)
	pos_y = _spin(panel, "Posição Y", -10000, 10000, 1)
	rotation_box = _spin(panel, "Rotação °", -3600, 3600, 0.5)
	scale_x = _spin(panel, "Escala X", -20, 20, 0.01); scale_x.value = 1
	scale_y = _spin(panel, "Escala Y", -20, 20, 0.01); scale_y.value = 1
	pivot_x = _spin(panel, "Pivô X (0–1)", -2, 2, 0.01); pivot_x.value = .5
	pivot_y = _spin(panel, "Pivô Y (0–1)", -2, 2, 0.01); pivot_y.value = .5
	z_box = _spin(panel, "Z Index", -1000, 1000, 1)
	var bone_label := Label.new(); bone_label.text = "Bone pai"; panel.add_child(bone_label)
	bone_parent = OptionButton.new(); panel.add_child(bone_parent)
	var socket_label := Label.new(); socket_label.text = "Socket"; panel.add_child(socket_label)
	socket_box = LineEdit.new(); socket_box.placeholder_text = "ex: RightHand"; panel.add_child(socket_box)
	for control in [pos_x,pos_y,rotation_box,scale_x,scale_y,pivot_x,pivot_y,z_box]:
		control.value_changed.connect(_on_inspector_changed)
	bone_parent.item_selected.connect(func(_i): _on_inspector_changed(0))
	socket_box.text_changed.connect(func(_t): _on_inspector_changed(0))
	var spacer := Control.new(); spacer.size_flags_vertical = Control.SIZE_EXPAND_FILL; panel.add_child(spacer)
	_add_button(panel, "Adicionar keyframe no frame atual", add_keyframe)
	_add_button(panel, "Remover keyframe", remove_keyframe)
	_add_button(panel, "Anexar peça ao socket informado", attach_to_socket)
	return panel

func build_timeline() -> Control:
	var box := VBoxContainer.new()
	box.custom_minimum_size.y = 190
	var controls := HBoxContainer.new()
	anim_name = OptionButton.new()
	for a in ["Idle","Walk","Run","Attack","Hurt","Death","Skill","Berserk"]: anim_name.add_item(a)
	anim_name.item_selected.connect(_on_animation_changed)
	controls.add_child(anim_name)
	direction = OptionButton.new()
	for d in ["Front","Back","Left","Right"]: direction.add_item(d)
	direction.item_selected.connect(_on_direction_changed)
	controls.add_child(direction)
	fps_box = SpinBox.new(); fps_box.min_value=1; fps_box.max_value=60; fps_box.value=12; fps_box.prefix="FPS "
	fps_box.value_changed.connect(_on_fps_changed); controls.add_child(fps_box)
	loop_check = CheckBox.new(); loop_check.text="Loop"; loop_check.button_pressed=true; controls.add_child(loop_check)
	_add_button(controls, "◀", previous_frame)
	_add_button(controls, "▶", next_frame)
	frame_label = Label.new(); frame_label.text="Frame 1 / 32"; controls.add_child(frame_label)
	_add_button(controls, "+ Key", add_keyframe)
	_add_button(controls, "Copy", copy_keyframe)
	_add_button(controls, "Paste", paste_keyframe)
	box.add_child(controls)
	var scroll := ScrollContainer.new(); scroll.horizontal_scroll_mode=ScrollContainer.SCROLL_MODE_AUTO; scroll.vertical_scroll_mode=ScrollContainer.SCROLL_MODE_DISABLED
	timeline_row = HBoxContainer.new(); timeline_row.add_theme_constant_override("separation", 3); scroll.add_child(timeline_row)
	box.add_child(scroll)
	return box

func build_dialogs() -> void:
	import_dialog = FileDialog.new(); import_dialog.file_mode=FileDialog.FILE_MODE_OPEN_FILE; import_dialog.access=FileDialog.ACCESS_FILESYSTEM; import_dialog.filters=PackedStringArray(["*.png ; PNG Images"]); import_dialog.file_selected.connect(_on_png_selected); add_child(import_dialog)
	open_dialog = FileDialog.new(); open_dialog.file_mode=FileDialog.FILE_MODE_OPEN_FILE; open_dialog.access=FileDialog.ACCESS_FILESYSTEM; open_dialog.filters=PackedStringArray(["*.json ; 2D Rig Lab Project"]); open_dialog.file_selected.connect(_on_project_open_selected); add_child(open_dialog)
	save_dialog = FileDialog.new(); save_dialog.file_mode=FileDialog.FILE_MODE_SAVE_FILE; save_dialog.access=FileDialog.ACCESS_FILESYSTEM; save_dialog.filters=PackedStringArray(["*.json ; 2D Rig Lab Project"]); save_dialog.file_selected.connect(_on_project_save_selected); add_child(save_dialog)

func bind_shortcuts() -> void:
	set_process_unhandled_key_input(true)

func _unhandled_key_input(event: InputEvent) -> void:
	if not event is InputEventKey or not event.pressed:
		return
	if event.ctrl_pressed and event.keycode == KEY_S: save_project()
	elif event.ctrl_pressed and event.keycode == KEY_Z: undo()
	elif event.ctrl_pressed and event.keycode == KEY_Y: redo()
	elif event.keycode == KEY_SPACE: toggle_play()
	elif event.keycode == KEY_F: focus_selected()
	elif event.keycode == KEY_DELETE: delete_selected()

func _process(delta: float) -> void:
	if not playing:
		return
	var anim := project.ensure_animation(project.active_animation, project.active_direction)
	var fps := float(anim.get("fps", project.fps))
	playback_frame += delta * fps
	var max_frames := int(anim.get("frames", project.frame_count))
	if playback_frame > max_frames:
		if loop_check.button_pressed:
			playback_frame = 1.0
		else:
			stop_playback(); return
	current_frame = clamp(int(round(playback_frame)), 1, max_frames)
	apply_animation_sample(playback_frame)
	update_frame_ui(false)

func new_project() -> void:
	project = RigProjectClass.new(); history.clear(); selected_id=""; selected_kind=""; current_frame=1; playback_frame=1
	refresh_all(); _set_status("Novo projeto criado")

func open_project() -> void: open_dialog.popup_centered_ratio(.7)
func import_png() -> void: import_dialog.popup_centered_ratio(.7)

func save_project() -> void:
	if project.project_path.is_empty():
		save_dialog.current_file = "character.json"; save_dialog.popup_centered_ratio(.7)
	else:
		_do_save(project.project_path)

func export_json() -> void:
	var path := project.project_path
	if path.is_empty():
		save_dialog.current_file="character_export.json"; save_dialog.popup_centered_ratio(.7); return
	var export_dir := path.get_base_dir().path_join("exports")
	DirAccess.make_dir_recursive_absolute(export_dir)
	var export_path := export_dir.path_join("character.json")
	var err := ProjectStoreClass.save_project(project, export_path)
	_set_status("Exportado: " + export_path if err == OK else "Falha na exportação")

func _on_project_save_selected(path: String) -> void: _do_save(path)
func _do_save(path: String) -> void:
	var err := ProjectStoreClass.save_project(project, path)
	_set_status("Projeto salvo: " + path if err == OK else "Erro ao salvar: %s" % err)

func _on_project_open_selected(path: String) -> void:
	var loaded := ProjectStoreClass.load_project(path)
	if loaded == null:
		_set_status("Arquivo inválido"); return
	project = loaded; history.clear(); selected_id=""; current_frame=1; refresh_all(); _set_status("Projeto aberto: " + path)

func _on_png_selected(path: String) -> void:
	var used_path := path
	if not project.project_path.is_empty():
		used_path = ProjectStoreClass.copy_sprite_to_project(path, project.project_path.get_base_dir())
	var id := "piece_%d" % Time.get_ticks_msec()
	var piece := {"id":id,"name":path.get_file().get_basename(),"type":"part","texture":used_path,"position":[0.0,0.0],"rotation":0.0,"scale":[1.0,1.0],"pivot":[0.5,0.5],"bone_parent":"","socket":"","z_index":project.pieces.size()}
	project.add_piece(piece); selected_kind="piece"; selected_id=id
	refresh_all(); canvas.selected_id=id; canvas.focus_selected(); _set_status("PNG importado: " + path.get_file())

func add_bone() -> void:
	var id := "bone_%d" % Time.get_ticks_msec()
	project.add_bone({"id":id,"name":"Bone_%d" % (project.bones.size()+1),"parent":"","position":[0.0,0.0],"rotation":0.0,"scale":[1.0,1.0],"length":60.0})
	selected_kind="bone"; selected_id=id; refresh_all(); _set_status("Bone criado")

func add_socket() -> void:
	var id := "socket_%d" % Time.get_ticks_msec()
	project.add_socket({"id":id,"name":"RightHand" if project.sockets.is_empty() else "Socket_%d" % (project.sockets.size()+1),"bone_parent":selected_id if selected_kind=="bone" else "","position":[0.0,0.0],"rotation":0.0,"scale":[1.0,1.0]})
	selected_kind="socket"; selected_id=id; refresh_all(); _set_status("Socket criado")

func attach_to_socket() -> void:
	if selected_kind != "piece" or selected_id.is_empty(): return
	var piece := find_item("piece", selected_id)
	var socket_name := socket_box.text.strip_edges()
	for s in project.sockets:
		if s.get("name","") == socket_name:
			piece["socket"] = socket_name
			piece["bone_parent"] = s.get("bone_parent","")
			piece["position"] = s.get("position",[0,0]).duplicate()
			refresh_all(); _set_status("Peça anexada ao socket " + socket_name); return
	_set_status("Socket não encontrado: " + socket_name)

func add_keyframe() -> void:
	if selected_id.is_empty(): return
	var item := find_item(selected_kind, selected_id)
	if item.is_empty(): return
	project.add_keyframe(selected_id, current_frame, transform_of(item)); refresh_timeline(); _set_status("Keyframe adicionado no frame %d" % current_frame)

func remove_keyframe() -> void:
	if selected_id.is_empty(): return
	project.remove_keyframe(selected_id, current_frame); refresh_timeline()

func copy_keyframe() -> void:
	if selected_id.is_empty(): return
	var item := find_item(selected_kind, selected_id)
	clipboard_key = transform_of(item).duplicate(true); _set_status("Keyframe copiado")

func paste_keyframe() -> void:
	if clipboard_key.is_empty() or selected_id.is_empty(): return
	project.add_keyframe(selected_id,current_frame,clipboard_key); apply_transform(find_item(selected_kind,selected_id),clipboard_key); refresh_all(); _set_status("Keyframe colado")

func previous_frame() -> void: set_frame(max(1,current_frame-1))
func next_frame() -> void: set_frame(min(project.frame_count,current_frame+1))
func set_frame(frame: int) -> void:
	current_frame=frame; playback_frame=float(frame); apply_animation_sample(float(frame)); update_frame_ui(); refresh_inspector()

func toggle_play() -> void:
	playing = not playing; play_button.text = "⏸ Pause" if playing else "▶ Play"
	if playing: playback_frame=float(current_frame)

func stop_playback() -> void:
	playing=false; play_button.text="▶ Play"; set_frame(1)

func apply_animation_sample(frame_f: float) -> void:
	for kind in ["piece","bone","socket"]:
		var array := project.pieces if kind=="piece" else (project.bones if kind=="bone" else project.sockets)
		for item in array:
			var sample := project.sample_track(item.get("id",""),frame_f)
			if not sample.is_empty(): apply_transform(item,sample)
	if canvas: canvas.queue_redraw()

func undo() -> void:
	var state := history.undo(); if state.is_empty() or selected_id.is_empty(): return
	apply_transform(find_item(selected_kind,selected_id),state); refresh_all(); _set_status("Undo")

func redo() -> void:
	var state := history.redo(); if state.is_empty() or selected_id.is_empty(): return
	apply_transform(find_item(selected_kind,selected_id),state); refresh_all(); _set_status("Redo")

func delete_selected() -> void:
	if selected_id.is_empty(): return
	var array := project.pieces if selected_kind=="piece" else (project.bones if selected_kind=="bone" else project.sockets)
	for i in range(array.size()-1,-1,-1):
		if array[i].get("id","")==selected_id: array.remove_at(i); break
	selected_id=""; selected_kind=""; refresh_all(); _set_status("Objeto removido")

func focus_selected() -> void:
	if canvas: canvas.selected_id=selected_id; canvas.focus_selected()

func refresh_all() -> void:
	if canvas: canvas.set_project(project)
	refresh_hierarchy(); refresh_inspector(); refresh_timeline(); refresh_bone_options()
	fps_box.value=project.fps if fps_box else 12

func refresh_hierarchy() -> void:
	if hierarchy == null: return
	hierarchy.clear(); var root := hierarchy.create_item()
	var bones_root := hierarchy.create_item(root); bones_root.set_text(0,"Bones")
	for b in project.bones:
		var item := hierarchy.create_item(bones_root); item.set_text(0,"◇ "+b.get("name","Bone")); item.set_metadata(0,{"kind":"bone","id":b.get("id","")})
	var parts_root := hierarchy.create_item(root); parts_root.set_text(0,"Peças")
	for p in project.pieces:
		var item := hierarchy.create_item(parts_root); item.set_text(0,"▧ "+p.get("name","Part")); item.set_metadata(0,{"kind":"piece","id":p.get("id","")})
	var socket_root := hierarchy.create_item(root); socket_root.set_text(0,"Sockets")
	for s in project.sockets:
		var item := hierarchy.create_item(socket_root); item.set_text(0,"⊕ "+s.get("name","Socket")); item.set_metadata(0,{"kind":"socket","id":s.get("id","")})

func refresh_bone_options() -> void:
	if bone_parent == null: return
	bone_parent.clear(); bone_parent.add_item("(nenhum)"); bone_parent.set_item_metadata(0,"")
	for b in project.bones:
		bone_parent.add_item(b.get("name","Bone")); bone_parent.set_item_metadata(bone_parent.item_count-1,b.get("id",""))

func refresh_inspector() -> void:
	if inspector_title == null: return
	_updating_inspector=true
	var item := find_item(selected_kind,selected_id)
	inspector_title.text="PROPRIEDADES" if item.is_empty() else "%s · %s" % [selected_kind.to_upper(), item.get("name",selected_id)]
	var t := transform_of(item)
	var p: Array=t.get("position",[0,0]); var s: Array=t.get("scale",[1,1]); var pv: Array=t.get("pivot",[.5,.5])
	pos_x.value=p[0]; pos_y.value=p[1]; rotation_box.value=rad_to_deg(float(t.get("rotation",0.0))); scale_x.value=s[0]; scale_y.value=s[1]; pivot_x.value=pv[0]; pivot_y.value=pv[1]
	z_box.value=item.get("z_index",0) if not item.is_empty() else 0
	socket_box.text=item.get("socket","") if not item.is_empty() else ""
	refresh_bone_options(); var parent_id:=item.get("bone_parent","") if not item.is_empty() else ""
	for i in bone_parent.item_count:
		if bone_parent.get_item_metadata(i)==parent_id: bone_parent.select(i); break
	_updating_inspector=false

func refresh_timeline() -> void:
	if timeline_row == null: return
	for c in timeline_row.get_children(): c.queue_free()
	var anim := project.ensure_animation(project.active_animation,project.active_direction)
	var tracks: Dictionary=anim.get("tracks",{}); var selected_track: Dictionary=tracks.get(selected_id,{})
	for frame in range(1,project.frame_count+1):
		var b:=Button.new(); b.text=str(frame); b.custom_minimum_size=Vector2(42,42); b.toggle_mode=true; b.button_pressed=frame==current_frame
		if selected_track.has(str(frame)): b.modulate=Color("#67d9ff")
		b.pressed.connect(func(f=frame): set_frame(f)); timeline_row.add_child(b)
	update_frame_ui(false)

func update_frame_ui(rebuild: bool=true) -> void:
	if frame_label: frame_label.text="Frame %d / %d" % [current_frame,project.frame_count]
	if rebuild: refresh_timeline()

func _on_tree_selected() -> void:
	var item:=hierarchy.get_selected(); if item==null: return
	var meta=item.get_metadata(0); if typeof(meta)!=TYPE_DICTIONARY: return
	selected_kind=meta.get("kind",""); selected_id=meta.get("id",""); canvas.selected_id=selected_id; canvas.queue_redraw(); refresh_inspector(); refresh_timeline()

func _on_canvas_selected(kind:String,id:String) -> void:
	selected_kind=kind; selected_id=id; refresh_inspector(); refresh_timeline(); refresh_hierarchy()

func _on_canvas_transform_changed(id:String,before:Dictionary,after:Dictionary) -> void:
	selected_kind="piece"; selected_id=id; history.push("Move piece",before,after); refresh_inspector()

func _on_inspector_changed(_value) -> void:
	if _updating_inspector or selected_id.is_empty(): return
	var item:=find_item(selected_kind,selected_id); if item.is_empty(): return
	var before:=transform_of(item)
	item["position"]=[pos_x.value,pos_y.value]; item["rotation"]=deg_to_rad(rotation_box.value); item["scale"]=[scale_x.value,scale_y.value]; item["pivot"]=[pivot_x.value,pivot_y.value]; item["z_index"]=int(z_box.value)
	if bone_parent.item_count>0: item["bone_parent"]=bone_parent.get_item_metadata(bone_parent.selected)
	item["socket"]=socket_box.text
	history.push("Edit transform",before,transform_of(item)); canvas.queue_redraw()

func _on_animation_changed(index:int) -> void:
	project.active_animation=anim_name.get_item_text(index); project.ensure_animation(project.active_animation,project.active_direction); refresh_timeline()
func _on_direction_changed(index:int) -> void:
	project.active_direction=direction.get_item_text(index); project.ensure_animation(project.active_animation,project.active_direction); refresh_timeline()
func _on_fps_changed(value:float) -> void:
	project.fps=int(value); project.ensure_animation(project.active_animation,project.active_direction)["fps"]=int(value)

func find_item(kind:String,id:String) -> Dictionary:
	var array:=project.pieces if kind=="piece" else (project.bones if kind=="bone" else project.sockets)
	for item in array:
		if item.get("id","")==id: return item
	return {}

func transform_of(item:Dictionary) -> Dictionary:
	if item.is_empty(): return {"position":[0.0,0.0],"rotation":0.0,"scale":[1.0,1.0],"pivot":[.5,.5]}
	return {"position":item.get("position",[0.0,0.0]).duplicate(),"rotation":item.get("rotation",0.0),"scale":item.get("scale",[1.0,1.0]).duplicate(),"pivot":item.get("pivot",[.5,.5]).duplicate()}

func apply_transform(item:Dictionary,t:Dictionary) -> void:
	if item.is_empty(): return
	item["position"]=t.get("position",[0,0]).duplicate(); item["rotation"]=t.get("rotation",0.0); item["scale"]=t.get("scale",[1,1]).duplicate(); item["pivot"]=t.get("pivot",item.get("pivot",[.5,.5])).duplicate()
	if canvas: canvas.queue_redraw()

func _spin(parent:Control,label_text:String,min_v:float,max_v:float,step_v:float) -> SpinBox:
	var l:=Label.new(); l.text=label_text; parent.add_child(l); var s:=SpinBox.new(); s.min_value=min_v; s.max_value=max_v; s.step=step_v; s.allow_greater=true; s.allow_lesser=true; parent.add_child(s); return s

func _add_button(parent:Control,text:String,callable:Callable) -> Button:
	var b:=Button.new(); b.text=text; b.pressed.connect(callable); parent.add_child(b); return b

func _add_separator(parent:HBoxContainer) -> void:
	var sep:=VSeparator.new(); parent.add_child(sep)

func _set_status(text:String) -> void:
	if status: status.text=text
