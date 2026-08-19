class_name SkinManager
extends RefCounted

static func create_skin(project: RigProject, name: String) -> bool:
	var clean := name.strip_edges()
	if clean.is_empty() or project.skins.has(clean): return false
	project.skins[clean] = {"replacements": {}}
	return true

static func delete_skin(project: RigProject, name: String) -> bool:
	if name == "Skin_Default" or not project.skins.has(name): return false
	project.skins.erase(name)
	if project.active_skin == name: project.active_skin = "Skin_Default"
	return true

static func set_piece_texture(project: RigProject, skin_name: String, piece_id: String, texture_path: String) -> void:
	var skin := project.ensure_skin(skin_name)
	var replacements: Dictionary = skin["replacements"]
	if texture_path.is_empty(): replacements.erase(piece_id)
	else: replacements[piece_id] = texture_path

static func resolve_texture(project: RigProject, piece: Dictionary) -> String:
	var base: String = piece.get("texture", "")
	var skin := project.ensure_skin(project.active_skin)
	var replacements: Dictionary = skin.get("replacements", {})
	return replacements.get(piece.get("id", ""), base)

static func list_skins(project: RigProject) -> Array[String]:
	var names: Array[String] = []
	for key in project.skins.keys(): names.append(str(key))
	names.sort()
	return names
