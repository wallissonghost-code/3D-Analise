class_name RigCanvas
extends Control

signal item_selected(kind: String, item_id: String)
signal item_transform_changed(item_id: String, before: Dictionary, after: Dictionary)

var project: RigProject
var textures: Dictionary = {}
var selected_id := ""
var show_grid := true
var show_bones := true
var show_sockets := true
var show_pivots := true
var zoom := 1.0
var pan := Vector2.ZERO
var background := Color("#1a1d24")
var dragging := false
var panning := false
var drag_start_mouse := Vector2.ZERO
var drag_start_pos := Vector2.ZERO
var drag_before: Dictionary = {}

func _ready() -> void:
	mouse_filter = Control.MOUSE_FILTER_STOP
	set_process(true)

func set_project(value: RigProject) -> void:
	project = value
	textures.clear()
	_reload_textures()
	queue_redraw()

func _reload_textures() -> void:
	if project == null:
		return
	for piece in project.pieces:
		_load_piece_texture(piece)

func _load_piece_texture(piece: Dictionary) -> void:
	var path: String = piece.get("texture", "")
	if path.is_empty() or textures.has(path):
		return
	var image := Image.load_from_file(path)
	if image != null and not image.is_empty():
		textures[path] = ImageTexture.create_from_image(image)

func refresh_piece_texture(piece: Dictionary) -> void:
	var path: String = piece.get("texture", "")
	textures.erase(path)
	_load_piece_texture(piece)
	queue_redraw()

func focus_selected() -> void:
	var item := _piece_by_id(selected_id)
	if item.is_empty():
		return
	var p := _arr_v2(item.get("position", [0, 0]))
	pan = size * 0.5 - p * zoom
	queue_redraw()

func _draw() -> void:
	draw_rect(Rect2(Vector2.ZERO, size), background)
	if show_grid:
		_draw_grid()
	if project == null:
		return
	for piece in _sorted_pieces():
		_draw_piece(piece)
	if show_bones:
		_draw_bones()
	if show_sockets:
		_draw_sockets()

func _draw_grid() -> void:
	var spacing := 32.0 * zoom
	if spacing < 10.0:
		spacing *= 4.0
	var start_x := fmod(pan.x, spacing)
	var start_y := fmod(pan.y, spacing)
	for x in range(int(start_x), int(size.x), int(spacing)):
		draw_line(Vector2(x, 0), Vector2(x, size.y), Color(1,1,1,0.045), 1)
	for y in range(int(start_y), int(size.y), int(spacing)):
		draw_line(Vector2(0, y), Vector2(size.x, y), Color(1,1,1,0.045), 1)

func _sorted_pieces() -> Array:
	var out := project.pieces.duplicate(true)
	out.sort_custom(func(a, b): return int(a.get("z_index", 0)) < int(b.get("z_index", 0)))
	return out

func _draw_piece(piece: Dictionary) -> void:
	var path: String = piece.get("texture", "")
	if not textures.has(path):
		_load_piece_texture(piece)
	if not textures.has(path):
		return
	var tex: Texture2D = textures[path]
	var pos := _world_to_screen(_arr_v2(piece.get("position", [0,0])))
	var sc := _arr_v2(piece.get("scale", [1,1])) * zoom
	var pivot := _arr_v2(piece.get("pivot", [0.5,0.5]))
	var rot := float(piece.get("rotation", 0.0))
	var rect_size := Vector2(tex.get_width(), tex.get_height())
	var origin := -Vector2(rect_size.x * pivot.x, rect_size.y * pivot.y)
	draw_set_transform(pos, rot, sc)
	draw_texture(tex, origin)
	if piece.get("id", "") == selected_id:
		draw_rect(Rect2(origin, rect_size), Color("#57d9ff"), false, 2.0 / max(zoom, 0.1))
		if show_pivots:
			draw_circle(Vector2.ZERO, 4.5 / max(zoom,0.1), Color("#ffcc4d"))
	draw_set_transform(Vector2.ZERO, 0.0, Vector2.ONE)

func _draw_bones() -> void:
	for bone in project.bones:
		var a := _world_to_screen(_arr_v2(bone.get("position", [0,0])))
		var length := float(bone.get("length", 50.0)) * zoom
		var angle := float(bone.get("rotation", 0.0))
		var b := a + Vector2.RIGHT.rotated(angle) * length
		var col := Color("#ff9d4d") if bone.get("id","") == selected_id else Color(1.0,0.55,0.25,0.8)
		draw_line(a, b, col, 4.0)
		draw_circle(a, 5.0, col)
		draw_circle(b, 4.0, col)

func _draw_sockets() -> void:
	for socket in project.sockets:
		var p := _world_to_screen(_arr_v2(socket.get("position", [0,0])))
		var col := Color("#66f2a1")
		draw_circle(p, 7.0, col, false, 2.0)
		draw_line(p-Vector2(10,0), p+Vector2(10,0), col, 1)
		draw_line(p-Vector2(0,10), p+Vector2(0,10), col, 1)

func _gui_input(event: InputEvent) -> void:
	if event is InputEventMouseButton:
		if event.button_index == MOUSE_BUTTON_WHEEL_UP and event.pressed:
			_zoom_at(event.position, 1.12)
			accept_event()
		elif event.button_index == MOUSE_BUTTON_WHEEL_DOWN and event.pressed:
			_zoom_at(event.position, 0.89)
			accept_event()
		elif event.button_index == MOUSE_BUTTON_MIDDLE:
			panning = event.pressed
			drag_start_mouse = event.position
			accept_event()
		elif event.button_index == MOUSE_BUTTON_LEFT:
			if event.pressed:
				var hit := _hit_test(event.position)
				if not hit.is_empty():
					selected_id = hit.get("id", "")
					dragging = hit.get("kind", "") == "piece"
					if dragging:
						var piece := _piece_by_id(selected_id)
						drag_start_mouse = event.position
						drag_start_pos = _arr_v2(piece.get("position", [0,0]))
						drag_before = _transform_dict(piece)
					emit_signal("item_selected", hit.get("kind", "piece"), selected_id)
				else:
					selected_id = ""
				queue_redraw()
			else:
				if dragging:
					var piece := _piece_by_id(selected_id)
					emit_signal("item_transform_changed", selected_id, drag_before, _transform_dict(piece))
				dragging = false
	if event is InputEventMouseMotion:
		if panning:
			pan += event.relative
			queue_redraw()
		elif dragging:
			var piece := _piece_by_id(selected_id)
			if not piece.is_empty():
				var delta := (event.position - drag_start_mouse) / zoom
				piece["position"] = _v2_arr(drag_start_pos + delta)
				queue_redraw()

func _zoom_at(mouse: Vector2, factor: float) -> void:
	var before := _screen_to_world(mouse)
	zoom = clamp(zoom * factor, 0.15, 8.0)
	pan = mouse - before * zoom
	queue_redraw()

func _hit_test(screen_pos: Vector2) -> Dictionary:
	if project == null:
		return {}
	var pieces := _sorted_pieces()
	pieces.reverse()
	for piece in pieces:
		var path: String = piece.get("texture", "")
		if not textures.has(path):
			continue
		var tex: Texture2D = textures[path]
		var world := _screen_to_world(screen_pos)
		var pos := _arr_v2(piece.get("position", [0,0]))
		var local := (world - pos).rotated(-float(piece.get("rotation",0.0)))
		var sc := _arr_v2(piece.get("scale", [1,1]))
		local /= sc
		var pivot := _arr_v2(piece.get("pivot", [0.5,0.5]))
		var rect := Rect2(-Vector2(tex.get_width()*pivot.x, tex.get_height()*pivot.y), Vector2(tex.get_width(),tex.get_height()))
		if rect.has_point(local):
			return {"kind":"piece", "id":piece.get("id","")}
	return {}

func _piece_by_id(id: String) -> Dictionary:
	if project == null:
		return {}
	for p in project.pieces:
		if p.get("id", "") == id:
			return p
	return {}

func _transform_dict(piece: Dictionary) -> Dictionary:
	return {"position": piece.get("position", [0,0]).duplicate(), "rotation": piece.get("rotation",0.0), "scale": piece.get("scale",[1,1]).duplicate(), "pivot": piece.get("pivot",[0.5,0.5]).duplicate()}

func _world_to_screen(v: Vector2) -> Vector2:
	return v * zoom + pan

func _screen_to_world(v: Vector2) -> Vector2:
	return (v - pan) / zoom

func _arr_v2(value) -> Vector2:
	if value is Vector2:
		return value
	if value is Array and value.size() >= 2:
		return Vector2(float(value[0]), float(value[1]))
	return Vector2.ZERO

func _v2_arr(value: Vector2) -> Array:
	return [value.x, value.y]
