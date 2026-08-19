class_name RigCanvas
extends Control

signal item_selected(kind: String, item_id: String)
signal item_transform_changed(item_id: String, before: Dictionary, after: Dictionary)

const RigSolverClass = preload("res://scripts/rig/rig_solver.gd")
const SkinManagerClass = preload("res://scripts/skins/skin_manager.gd")
const WeaponManagerClass = preload("res://scripts/weapons/weapon_manager.gd")

var project: RigProject
var textures: Dictionary = {}
var selected_id := ""
var show_grid := true
var show_bones := true
var show_sockets := true
var show_pivots := true
var show_onion_skin := false
var onion_frame := 1.0
var onion_previous := 1
var onion_next := 1
var onion_alpha := 0.22
var zoom := 1.0
var pan := Vector2.ZERO
var background := Color("#1a1d24")
var dragging := false
var panning := false
var drag_start_mouse := Vector2.ZERO
var drag_start_pos := Vector2.ZERO
var drag_before: Dictionary = {}
var bone_cache: Dictionary = {}

func _ready()->void: mouse_filter=Control.MOUSE_FILTER_STOP; set_process(true)
func set_project(value:RigProject)->void: project=value; textures.clear(); _reload_textures(); queue_redraw()
func set_onion_frame(frame:float)->void: onion_frame=frame; queue_redraw()
func _reload_textures()->void:
	if project==null:return
	for piece in project.pieces:_load_piece_texture(piece)
	for skin_name in project.skins.keys():
		var skin:Dictionary=project.skins[skin_name]
		for path in skin.get("replacements",{}).values():_load_texture_path(str(path))
	for weapon in project.weapons:_load_texture_path(weapon.get("texture",""))
func _load_texture_path(path:String)->void:
	if path.is_empty() or textures.has(path):return
	var image:=Image.load_from_file(path)
	if image!=null and not image.is_empty():textures[path]=ImageTexture.create_from_image(image)
func _load_piece_texture(piece:Dictionary)->void:_load_texture_path(piece.get("texture",""));if project!=null:_load_texture_path(SkinManagerClass.resolve_texture(project,piece))
func refresh_piece_texture(piece:Dictionary)->void:_load_piece_texture(piece);queue_redraw()

func focus_selected()->void:
	if project==null:return
	bone_cache.clear();var world:=Transform2D.IDENTITY;var piece:=_piece_by_id(selected_id)
	if not piece.is_empty():world=RigSolverClass.piece_world(project,piece,bone_cache)
	else:
		var bone:=_bone_by_id(selected_id)
		if not bone.is_empty():world=RigSolverClass.bone_world(project,selected_id,bone_cache)
		else:
			var socket:=_socket_by_id(selected_id)
			if not socket.is_empty():world=RigSolverClass.socket_world(project,socket,bone_cache)
	pan=size*.5-world.origin*zoom;queue_redraw()

func _draw()->void:
	draw_rect(Rect2(Vector2.ZERO,size),background)
	if show_grid:_draw_grid()
	if project==null:return
	if show_onion_skin:_draw_onion_skins()
	bone_cache.clear()
	for piece in _sorted_pieces():_draw_piece(piece)
	_draw_equipped_weapon()
	if show_bones:_draw_bones()
	if show_sockets:_draw_sockets()

func _draw_onion_skins()->void:
	for offset in range(onion_previous,0,-1):
		var f:=int(round(onion_frame))-offset
		if f>=1:_draw_onion_frame(float(f),Color(.35,.75,1.0,onion_alpha/max(1.0,float(offset))))
	for offset in range(1,onion_next+1):
		var f:=int(round(onion_frame))+offset
		if f<=project.frame_count:_draw_onion_frame(float(f),Color(1.0,.45,.55,onion_alpha/max(1.0,float(offset))))
func _draw_onion_frame(frame_f:float,tint:Color)->void:
	var original:Array=[]
	for kind in ["piece","bone","socket"]:
		var arr:=project.pieces if kind=="piece" else (project.bones if kind=="bone" else project.sockets)
		for item in arr:
			original.append({"item":item,"transform":_transform_dict(item)});var sample:=project.sample_track(item.get("id",""),frame_f);if not sample.is_empty():_apply_transform(item,sample)
	bone_cache.clear();for piece in _sorted_pieces():_draw_piece_ghost(piece,tint);_draw_equipped_weapon(tint)
	for saved in original:_apply_transform(saved["item"],saved["transform"])
	bone_cache.clear()
func _draw_piece_ghost(piece:Dictionary,tint:Color)->void:
	var path:=SkinManagerClass.resolve_texture(project,piece);_load_texture_path(path);if not textures.has(path):return
	var tex:Texture2D=textures[path];var world:Transform2D=RigSolverClass.piece_world(project,piece,bone_cache);var pivot:=_arr_v2(piece.get("pivot",[.5,.5]));var rs:=Vector2(tex.get_width(),tex.get_height());var origin:=-Vector2(rs.x*pivot.x,rs.y*pivot.y);draw_set_transform(_world_to_screen(world.origin),world.get_rotation(),world.get_scale()*zoom);draw_texture(tex,origin,tint);draw_set_transform(Vector2.ZERO,0.0,Vector2.ONE)

func _draw_grid()->void:
	var spacing:=32.0*zoom;if spacing<10.0:spacing*=4.0
	var sx:=fmod(pan.x,spacing);var sy:=fmod(pan.y,spacing)
	for x in range(int(sx),int(size.x),max(1,int(spacing))):draw_line(Vector2(x,0),Vector2(x,size.y),Color(1,1,1,.045),1)
	for y in range(int(sy),int(size.y),max(1,int(spacing))):draw_line(Vector2(0,y),Vector2(size.x,y),Color(1,1,1,.045),1)
func _sorted_pieces()->Array:var out:=project.pieces.duplicate(true);out.sort_custom(func(a,b):return int(a.get("z_index",0))<int(b.get("z_index",0)));return out
func _draw_piece(piece:Dictionary)->void:
	var path:=SkinManagerClass.resolve_texture(project,piece);_load_texture_path(path);if not textures.has(path):return
	var tex:Texture2D=textures[path];var world:Transform2D=RigSolverClass.piece_world(project,piece,bone_cache);var pivot:=_arr_v2(piece.get("pivot",[.5,.5]));var rs:=Vector2(tex.get_width(),tex.get_height());var origin:=-Vector2(rs.x*pivot.x,rs.y*pivot.y);draw_set_transform(_world_to_screen(world.origin),world.get_rotation(),world.get_scale()*zoom);draw_texture(tex,origin)
	if piece.get("id","")==selected_id:draw_rect(Rect2(origin,rs),Color("#57d9ff"),false,2.0/max(zoom,.1));if show_pivots:draw_circle(Vector2.ZERO,4.5/max(zoom,.1),Color("#ffcc4d"))
	draw_set_transform(Vector2.ZERO,0.0,Vector2.ONE)
func _draw_equipped_weapon(tint:Color=Color.WHITE)->void:
	if project.equipped_weapon.is_empty():return
	var weapon:=WeaponManagerClass.find_weapon(project,project.equipped_weapon);if weapon.is_empty():return
	var path:String=weapon.get("texture","");_load_texture_path(path);if not textures.has(path):return
	var socket:=RigSolverClass.socket_by_name(project,weapon.get("socket","RightHand"));if socket.is_empty():return
	var base:Transform2D=RigSolverClass.socket_world(project,socket,bone_cache);var offset:=_arr_v2(weapon.get("offset",[0,0]));var scale:=_arr_v2(weapon.get("scale",[1,1]));var local:=Transform2D(float(weapon.get("rotation",0.0)),scale,0.0,offset);var world:=base*local;var tex:Texture2D=textures[path];var origin:=-Vector2(tex.get_width()*.5,tex.get_height()*.5);draw_set_transform(_world_to_screen(world.origin),world.get_rotation(),world.get_scale()*zoom);draw_texture(tex,origin,tint);draw_set_transform(Vector2.ZERO,0.0,Vector2.ONE)
func _draw_bones()->void:
	for bone in project.bones:
		var world:Transform2D=RigSolverClass.bone_world(project,bone.get("id",""),bone_cache);var a:=_world_to_screen(world.origin);var length:=float(bone.get("length",50))*world.get_scale().x*zoom;var b:=a+Vector2.RIGHT.rotated(world.get_rotation())*length;var col:=Color("#ffcc4d") if bone.get("id","")==selected_id else Color(1,.55,.25,.86);draw_line(a,b,col,4);draw_circle(a,5,col);draw_circle(b,4,col)
func _draw_sockets()->void:
	for socket in project.sockets:
		var world:Transform2D=RigSolverClass.socket_world(project,socket,bone_cache);var p:=_world_to_screen(world.origin);var col:=Color("#66f2a1") if socket.get("id","")!=selected_id else Color.WHITE;draw_circle(p,7,col,false,2);draw_line(p-Vector2(10,0),p+Vector2(10,0),col,1);draw_line(p-Vector2(0,10),p+Vector2(0,10),col,1)

func _gui_input(event:InputEvent)->void:
	if event is InputEventMouseButton:
		if event.button_index==MOUSE_BUTTON_WHEEL_UP and event.pressed:_zoom_at(event.position,1.12);accept_event()
		elif event.button_index==MOUSE_BUTTON_WHEEL_DOWN and event.pressed:_zoom_at(event.position,.89);accept_event()
		elif event.button_index==MOUSE_BUTTON_MIDDLE:panning=event.pressed;drag_start_mouse=event.position;accept_event()
		elif event.button_index==MOUSE_BUTTON_LEFT:
			if event.pressed:
				var hit:=_hit_test(event.position)
				if not hit.is_empty():selected_id=hit.get("id","");dragging=hit.get("kind","")=="piece";if dragging:var piece:=_piece_by_id(selected_id);drag_start_mouse=event.position;drag_start_pos=_arr_v2(piece.get("position",[0,0]));drag_before=_transform_dict(piece);emit_signal("item_selected",hit.get("kind","piece"),selected_id)
				else:selected_id=""
				queue_redraw()
			else:
				if dragging:var piece:=_piece_by_id(selected_id);emit_signal("item_transform_changed",selected_id,drag_before,_transform_dict(piece))
				dragging=false
	if event is InputEventMouseMotion:
		if panning:pan+=event.relative;queue_redraw()
		elif dragging:
			var piece:=_piece_by_id(selected_id)
			if not piece.is_empty():var dw:=(event.position-drag_start_mouse)/zoom;var parent:=_piece_parent_world(piece);piece["position"]=_v2_arr(drag_start_pos+parent.basis_xform_inv(dw));queue_redraw()
func _piece_parent_world(piece:Dictionary)->Transform2D:
	bone_cache.clear();var socket_name:String=piece.get("socket","")
	if not socket_name.is_empty():var socket:=RigSolverClass.socket_by_name(project,socket_name);if not socket.is_empty():return RigSolverClass.socket_world(project,socket,bone_cache)
	return RigSolverClass.bone_world(project,piece.get("bone_parent",""),bone_cache)
func _zoom_at(mouse:Vector2,factor:float)->void:var before:=_screen_to_world(mouse);zoom=clamp(zoom*factor,.15,8.0);pan=mouse-before*zoom;queue_redraw()
func _hit_test(screen_pos:Vector2)->Dictionary:
	if project==null:return {}
	bone_cache.clear();var pieces:=_sorted_pieces();pieces.reverse()
	for piece in pieces:
		var path:=SkinManagerClass.resolve_texture(project,piece);_load_texture_path(path);if not textures.has(path):continue
		var tex:Texture2D=textures[path];var wm:=_screen_to_world(screen_pos);var xf:Transform2D=RigSolverClass.piece_world(project,piece,bone_cache);var local:=xf.affine_inverse()*wm;var pivot:=_arr_v2(piece.get("pivot",[.5,.5]));var rect:=Rect2(-Vector2(tex.get_width()*pivot.x,tex.get_height()*pivot.y),Vector2(tex.get_width(),tex.get_height()));if rect.has_point(local):return {"kind":"piece","id":piece.get("id","")}
	for socket in project.sockets:var sw:=RigSolverClass.socket_world(project,socket,bone_cache);if _world_to_screen(sw.origin).distance_to(screen_pos)<=12:return {"kind":"socket","id":socket.get("id","")}
	for bone in project.bones:var bw:=RigSolverClass.bone_world(project,bone.get("id",""),bone_cache);if _world_to_screen(bw.origin).distance_to(screen_pos)<=12:return {"kind":"bone","id":bone.get("id","")}
	return {}
func _apply_transform(item:Dictionary,t:Dictionary)->void:item["position"]=t.get("position",[0,0]).duplicate();item["rotation"]=t.get("rotation",0.0);item["scale"]=t.get("scale",[1,1]).duplicate();item["pivot"]=t.get("pivot",item.get("pivot",[.5,.5])).duplicate()
func _piece_by_id(id:String)->Dictionary:if project==null:return {};for p in project.pieces:if p.get("id","")==id:return p;return {}
func _bone_by_id(id:String)->Dictionary:for b in project.bones:if b.get("id","")==id:return b;return {}
func _socket_by_id(id:String)->Dictionary:for s in project.sockets:if s.get("id","")==id:return s;return {}
func _transform_dict(item:Dictionary)->Dictionary:return {"position":item.get("position",[0,0]).duplicate(),"rotation":item.get("rotation",0.0),"scale":item.get("scale",[1,1]).duplicate(),"pivot":item.get("pivot",[.5,.5]).duplicate()}
func _world_to_screen(v:Vector2)->Vector2:return v*zoom+pan
func _screen_to_world(v:Vector2)->Vector2:return (v-pan)/zoom
func _arr_v2(value)->Vector2:return RigSolverClass.arr_v2(value)
func _v2_arr(value:Vector2)->Array:return [value.x,value.y]
