extends Control

const DesktopScene = preload("res://scenes/DesktopEditor.tscn")
const MobileScene = preload("res://scenes/MobileEditor.tscn")

func _ready() -> void:
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	call_deferred("_load_editor")

func _load_editor() -> void:
	var viewport_size := get_viewport_rect().size
	var use_mobile := viewport_size.x < 820.0 or viewport_size.y > viewport_size.x * 1.15
	var editor = (MobileScene if use_mobile else DesktopScene).instantiate()
	editor.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	add_child(editor)
