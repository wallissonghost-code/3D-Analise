class_name SkinData
extends RefCounted

var id := "Skin_Default"
var replacements: Dictionary = {}

func set_texture(piece_id: String, texture_path: String) -> void:
	replacements[piece_id] = texture_path

func to_dict() -> Dictionary:
	return {"id": id, "replacements": replacements.duplicate(true)}
