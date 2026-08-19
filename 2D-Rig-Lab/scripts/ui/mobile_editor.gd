extends "res://scripts/ui/main_editor.gd"

func build_ui() -> void:
	var root := VBoxContainer.new()
	root.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	root.add_theme_constant_override("separation", 4)
	add_child(root)
	var toolbar_scroll := ScrollContainer.new()
	toolbar_scroll.custom_minimum_size.y = 58
	toolbar_scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_AUTO
	toolbar_scroll.vertical_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	var toolbar := build_toolbar()
	toolbar.custom_minimum_size.y = 54
	toolbar_scroll.add_child(toolbar)
	root.add_child(toolbar_scroll)
	var view_tools_scroll := ScrollContainer.new()
	view_tools_scroll.custom_minimum_size.y = 44
	view_tools_scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_AUTO
	view_tools_scroll.vertical_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	var view_tools := build_viewport_toolbar()
	view_tools_scroll.add_child(view_tools)
	root.add_child(view_tools_scroll)
	canvas = RigCanvasClass.new()
	canvas.custom_minimum_size = Vector2(0, 280)
	canvas.size_flags_vertical = Control.SIZE_EXPAND_FILL
	canvas.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	canvas.item_selected.connect(_on_canvas_selected)
	canvas.item_transform_changed.connect(_on_canvas_transform_changed)
	root.add_child(canvas)
	var tabs := TabContainer.new()
	tabs.custom_minimum_size = Vector2(0, 300)
	tabs.size_flags_vertical = Control.SIZE_EXPAND_FILL
	root.add_child(tabs)
	var hierarchy_panel := build_left_panel()
	hierarchy_panel.name = "Hierarquia"
	_relax_minimums(hierarchy_panel)
	tabs.add_child(hierarchy_panel)
	var inspector_panel := build_inspector()
	_relax_minimums(inspector_panel)
	var inspector_scroll := ScrollContainer.new()
	inspector_scroll.name = "Propriedades"
	inspector_scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	inspector_scroll.vertical_scroll_mode = ScrollContainer.SCROLL_MODE_AUTO
	inspector_scroll.add_child(inspector_panel)
	tabs.add_child(inspector_scroll)
	var timeline_panel := build_timeline()
	timeline_panel.name = "Timeline"
	_relax_minimums(timeline_panel)
	tabs.add_child(timeline_panel)
	status = Label.new()
	status.text = "2D Rig Lab · Mobile"
	status.custom_minimum_size.y = 28
	status.add_theme_font_size_override("font_size", 16)
	root.add_child(status)
	build_dialogs()
	_apply_touch_sizes(root)
	var assets = get_node_or_null("AssetManagerPanel")
	if assets:
		assets.visible = false
		assets.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
		assets.offset_left = 8
		assets.offset_top = 70
		assets.offset_right = -8
		assets.offset_bottom = -20
		assets.z_index = 50
		var asset_button := Button.new()
		asset_button.text = "Skins / Equip."
		asset_button.custom_minimum_size = Vector2(130, 44)
		asset_button.pressed.connect(func(): assets.visible = not assets.visible)
		toolbar.add_child(asset_button)

func _relax_minimums(node: Node) -> void:
	if node is Control:
		var c := node as Control
		if c.custom_minimum_size.x > 0: c.custom_minimum_size.x = 0
	for child in node.get_children(): _relax_minimums(child)

func _apply_touch_sizes(node: Node) -> void:
	if node is Button:
		var b := node as Button
		b.custom_minimum_size.y = max(b.custom_minimum_size.y, 44.0)
		b.add_theme_font_size_override("font_size", 16)
	elif node is LineEdit:
		var l := node as LineEdit
		l.custom_minimum_size.y = max(l.custom_minimum_size.y, 44.0)
		l.add_theme_font_size_override("font_size", 16)
	elif node is SpinBox:
		var s := node as SpinBox
		s.custom_minimum_size.y = max(s.custom_minimum_size.y, 44.0)
	elif node is OptionButton:
		var o := node as OptionButton
		o.custom_minimum_size.y = max(o.custom_minimum_size.y, 44.0)
		o.add_theme_font_size_override("font_size", 16)
	for child in node.get_children(): _apply_touch_sizes(child)
