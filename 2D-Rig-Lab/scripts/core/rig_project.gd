class_name RigProject
extends RefCounted

var project_name: String = "Untitled"
var project_path: String = ""
var fps: int = 12
var frame_count: int = 32
var active_animation: String = "Idle"
var active_direction: String = "Front"
var active_skin: String = "Skin_Default"
var equipped_weapon: String = ""
var pieces: Array[Dictionary] = []
var bones: Array[Dictionary] = []
var sockets: Array[Dictionary] = []
var animations: Dictionary = {}
var skins: Dictionary = {"Skin_Default": {"replacements": {}}}
var weapons: Array[Dictionary] = []
var effects: Array[Dictionary] = []

func _init() -> void:
	ensure_animation("Idle", "Front")
	ensure_skin("Skin_Default")

func ensure_animation(name: String, direction: String) -> Dictionary:
	if not animations.has(name): animations[name] = {}
	if not animations[name].has(direction): animations[name][direction] = {"fps": fps, "frames": frame_count, "loop": true, "tracks": {}}
	return animations[name][direction]

func ensure_skin(name: String) -> Dictionary:
	if not skins.has(name): skins[name] = {"replacements": {}}
	elif not skins[name].has("replacements"): skins[name]["replacements"] = {}
	return skins[name]

func add_piece(data: Dictionary) -> void: pieces.append(data)
func add_bone(data: Dictionary) -> void: bones.append(data)
func add_socket(data: Dictionary) -> void: sockets.append(data)

func add_keyframe(target_id: String, frame: int, transform_data: Dictionary) -> void:
	var anim := ensure_animation(active_animation, active_direction)
	var tracks: Dictionary = anim["tracks"]
	if not tracks.has(target_id): tracks[target_id] = {}
	tracks[target_id][str(frame)] = transform_data.duplicate(true)

func remove_keyframe(target_id: String, frame: int) -> void:
	var anim := ensure_animation(active_animation, active_direction)
	var tracks: Dictionary = anim["tracks"]
	if tracks.has(target_id): tracks[target_id].erase(str(frame))

func sample_track(target_id: String, frame_f: float) -> Dictionary:
	var anim := ensure_animation(active_animation, active_direction)
	var tracks: Dictionary = anim["tracks"]
	if not tracks.has(target_id) or tracks[target_id].is_empty(): return {}
	var keys: Array[int] = []
	for k in tracks[target_id].keys(): keys.append(int(k))
	keys.sort()
	if frame_f <= keys[0]: return tracks[target_id][str(keys[0])].duplicate(true)
	if frame_f >= keys[-1]: return tracks[target_id][str(keys[-1])].duplicate(true)
	var a := keys[0]; var b := keys[-1]
	for i in range(keys.size() - 1):
		if frame_f >= keys[i] and frame_f <= keys[i + 1]: a = keys[i]; b = keys[i + 1]; break
	var ta: Dictionary = tracks[target_id][str(a)]; var tb: Dictionary = tracks[target_id][str(b)]
	var t := inverse_lerp(float(a), float(b), frame_f)
	return {"position": _lerp_v2(ta.get("position", [0.0, 0.0]), tb.get("position", [0.0, 0.0]), t), "rotation": lerp_angle(float(ta.get("rotation", 0.0)), float(tb.get("rotation", 0.0)), t), "scale": _lerp_v2(ta.get("scale", [1.0, 1.0]), tb.get("scale", [1.0, 1.0]), t)}

func _lerp_v2(a: Array, b: Array, t: float) -> Array:
	return [lerp(float(a[0]), float(b[0]), t), lerp(float(a[1]), float(b[1]), t)]

func to_dict() -> Dictionary:
	return {"format":"2d-rig-lab","version":2,"project_name":project_name,"fps":fps,"frame_count":frame_count,"active_animation":active_animation,"active_direction":active_direction,"active_skin":active_skin,"equipped_weapon":equipped_weapon,"pieces":pieces,"bones":bones,"sockets":sockets,"animations":animations,"skins":skins,"weapons":weapons,"effects":effects}

func from_dict(data: Dictionary) -> void:
	project_name = data.get("project_name", "Untitled")
	fps = int(data.get("fps", 12)); frame_count = int(data.get("frame_count", 32))
	active_animation = data.get("active_animation", "Idle"); active_direction = data.get("active_direction", "Front")
	active_skin = data.get("active_skin", "Skin_Default"); equipped_weapon = data.get("equipped_weapon", "")
	pieces = data.get("pieces", []); bones = data.get("bones", []); sockets = data.get("sockets", [])
	animations = data.get("animations", {}); skins = data.get("skins", {"Skin_Default":{"replacements":{}}}); weapons = data.get("weapons", []); effects = data.get("effects", [])
	ensure_animation(active_animation, active_direction); ensure_skin(active_skin)
