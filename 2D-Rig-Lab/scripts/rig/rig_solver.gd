class_name RigSolver
extends RefCounted

static func bone_by_id(project: RigProject, id: String) -> Dictionary:
	for bone in project.bones:
		if bone.get("id", "") == id:
			return bone
	return {}

static func socket_by_name(project: RigProject, socket_name: String) -> Dictionary:
	for socket in project.sockets:
		if socket.get("name", "") == socket_name:
			return socket
	return {}

static func bone_world(project: RigProject, bone_id: String, cache: Dictionary = {}, visiting: Dictionary = {}) -> Transform2D:
	if bone_id.is_empty():
		return Transform2D.IDENTITY
	if cache.has(bone_id):
		return cache[bone_id]
	if visiting.has(bone_id):
		return Transform2D.IDENTITY
	var bone := bone_by_id(project, bone_id)
	if bone.is_empty():
		return Transform2D.IDENTITY
	visiting[bone_id] = true
	var local := local_transform(bone)
	var parent_id: String = bone.get("parent", bone.get("bone_parent", ""))
	var world := local
	if not parent_id.is_empty() and parent_id != bone_id:
		world = bone_world(project, parent_id, cache, visiting) * local
	visiting.erase(bone_id)
	cache[bone_id] = world
	return world

static func socket_world(project: RigProject, socket: Dictionary, cache: Dictionary = {}) -> Transform2D:
	var parent := bone_world(project, socket.get("bone_parent", ""), cache)
	return parent * local_transform(socket)

static func piece_world(project: RigProject, piece: Dictionary, cache: Dictionary = {}) -> Transform2D:
	var local := local_transform(piece)
	var socket_name: String = piece.get("socket", "")
	if not socket_name.is_empty():
		var socket := socket_by_name(project, socket_name)
		if not socket.is_empty():
			return socket_world(project, socket, cache) * local
	var parent_id: String = piece.get("bone_parent", "")
	if not parent_id.is_empty():
		return bone_world(project, parent_id, cache) * local
	return local

static func local_transform(item: Dictionary) -> Transform2D:
	var p := arr_v2(item.get("position", [0.0, 0.0]))
	var s := arr_v2(item.get("scale", [1.0, 1.0]))
	return Transform2D(float(item.get("rotation", 0.0)), s, 0.0, p)

static func arr_v2(value) -> Vector2:
	if value is Vector2:
		return value
	if value is Array and value.size() >= 2:
		return Vector2(float(value[0]), float(value[1]))
	return Vector2.ZERO
