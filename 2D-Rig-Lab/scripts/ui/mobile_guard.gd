extends Control

var card: PanelContainer
var label: Label

func _ready() -> void:
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	mouse_filter = Control.MOUSE_FILTER_STOP
	z_index = 1000
	_build()
	get_viewport().size_changed.connect(_refresh)
	call_deferred("_refresh")

func _build() -> void:
	card = PanelContainer.new()
	card.set_anchors_preset(Control.PRESET_CENTER)
	card.custom_minimum_size = Vector2(320, 220)
	add_child(card)
	var box := VBoxContainer.new()
	box.alignment = BoxContainer.ALIGNMENT_CENTER
	box.add_theme_constant_override("separation", 18)
	card.add_child(box)
	var title := Label.new()
	title.text = "2D RIG LAB"
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	title.add_theme_font_size_override("font_size", 28)
	box.add_child(title)
	var icon := Label.new()
	icon.text = "↻"
	icon.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	icon.add_theme_font_size_override("font_size", 64)
	box.add_child(icon)
	label = Label.new()
	label.text = "Gire o celular para a horizontal\npara usar o editor com espaço suficiente."
	label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	label.add_theme_font_size_override("font_size", 18)
	box.add_child(label)
	var hint := Label.new()
	hint.text = "No PC o editor abre normalmente."
	hint.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	hint.add_theme_color_override("font_color", Color("#9aa4b2"))
	box.add_child(hint)

func _refresh() -> void:
	var s := get_viewport_rect().size
	var narrow := s.x < 700.0
	var portrait := s.y > s.x
	visible = narrow and portrait
	if not visible:
		mouse_filter = Control.MOUSE_FILTER_IGNORE
	else:
		mouse_filter = Control.MOUSE_FILTER_STOP
	queue_redraw()

func _draw() -> void:
	if visible:
		draw_rect(Rect2(Vector2.ZERO, size), Color(0.035, 0.04, 0.055, 0.97))
