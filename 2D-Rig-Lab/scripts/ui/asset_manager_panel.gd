class_name AssetManagerPanel
extends PanelContainer

const SkinManagerClass = preload("res://scripts/skins/skin_manager.gd")
const WeaponManagerClass = preload("res://scripts/weapons/weapon_manager.gd")
const ProjectStoreClass = preload("res://scripts/project/project_store.gd")

var editor
var skin_select: OptionButton
var skin_name: LineEdit
var weapon_select: OptionButton
var weapon_name: LineEdit
var weapon_socket: LineEdit
var skin_dialog: FileDialog
var weapon_dialog: FileDialog
var info: Label
var _last_signature := ""

func _ready() -> void:
	custom_minimum_size = Vector2(315, 0)
	mouse_filter = Control.MOUSE_FILTER_STOP
	build_ui()
	call_deferred("_bind_editor")
	set_process(true)

func _bind_editor() -> void:
	editor = get_parent()
	refresh()

func build_ui() -> void:
	var root := VBoxContainer.new()
	root.add_theme_constant_override("separation", 6)
	add_child(root)
	var title := Label.new(); title.text = "SKINS & EQUIPAMENTOS"; root.add_child(title)
	info = Label.new(); info.text = "Skin troca PNG sem alterar bones ou animação."; info.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART; root.add_child(info)
	var skin_label := Label.new(); skin_label.text = "Skin ativa"; root.add_child(skin_label)
	skin_select = OptionButton.new(); skin_select.item_selected.connect(_on_skin_selected); root.add_child(skin_select)
	var skin_row := HBoxContainer.new(); skin_name = LineEdit.new(); skin_name.placeholder_text = "Skin_Red"; skin_name.size_flags_horizontal = Control.SIZE_EXPAND_FILL; skin_row.add_child(skin_name); var create_skin := Button.new(); create_skin.text = "+ Skin"; create_skin.pressed.connect(_create_skin); skin_row.add_child(create_skin); root.add_child(skin_row)
	var replace_btn := Button.new(); replace_btn.text = "Trocar PNG da peça nesta skin"; replace_btn.pressed.connect(_choose_skin_texture); root.add_child(replace_btn)
	var clear_btn := Button.new(); clear_btn.text = "Usar PNG original nesta peça"; clear_btn.pressed.connect(_clear_skin_texture); root.add_child(clear_btn)
	root.add_child(HSeparator.new())
	var weapon_label := Label.new(); weapon_label.text = "Armas"; root.add_child(weapon_label)
	weapon_select = OptionButton.new(); root.add_child(weapon_select)
	weapon_name = LineEdit.new(); weapon_name.placeholder_text = "Nome: Sword / Gun / Staff"; root.add_child(weapon_name)
	weapon_socket = LineEdit.new(); weapon_socket.text = "RightHand"; weapon_socket.placeholder_text = "Socket: RightHand"; root.add_child(weapon_socket)
	var weapon_row := HBoxContainer.new(); var add_weapon := Button.new(); add_weapon.text = "+ Registrar PNG"; add_weapon.pressed.connect(_choose_weapon_texture); weapon_row.add_child(add_weapon); var equip := Button.new(); equip.text = "Equipar"; equip.pressed.connect(_equip_selected); weapon_row.add_child(equip); root.add_child(weapon_row)
	var unequip := Button.new(); unequip.text = "Desarmar"; unequip.pressed.connect(_unequip); root.add_child(unequip)
	skin_dialog = FileDialog.new(); skin_dialog.file_mode = FileDialog.FILE_MODE_OPEN_FILE; skin_dialog.access = FileDialog.ACCESS_FILESYSTEM; skin_dialog.filters = PackedStringArray(["*.png ; PNG Images"]); skin_dialog.file_selected.connect(_on_skin_texture_selected); add_child(skin_dialog)
	weapon_dialog = FileDialog.new(); weapon_dialog.file_mode = FileDialog.FILE_MODE_OPEN_FILE; weapon_dialog.access = FileDialog.ACCESS_FILESYSTEM; weapon_dialog.filters = PackedStringArray(["*.png ; PNG Images"]); weapon_dialog.file_selected.connect(_on_weapon_texture_selected); add_child(weapon_dialog)

func _process(_delta: float) -> void:
	if editor == null: return
	var p = editor.project
	if p == null: return
	var sig := "%s|%s|%d|%d" % [p.active_skin, p.equipped_weapon, p.skins.size(), p.weapons.size()]
	if sig != _last_signature: refresh()

func refresh() -> void:
	if editor == null or editor.project == null: return
	var p = editor.project
	_last_signature = "%s|%s|%d|%d" % [p.active_skin, p.equipped_weapon, p.skins.size(), p.weapons.size()]
	skin_select.clear()
	var skins := SkinManagerClass.list_skins(p)
	for name in skins:
		skin_select.add_item(name)
		if name == p.active_skin: skin_select.select(skin_select.item_count - 1)
	weapon_select.clear(); weapon_select.add_item("(nenhuma)"); weapon_select.set_item_metadata(0, "")
	for weapon in p.weapons:
		weapon_select.add_item(weapon.get("name", "Weapon")); weapon_select.set_item_metadata(weapon_select.item_count - 1, weapon.get("id", ""))
		if weapon.get("id", "") == p.equipped_weapon: weapon_select.select(weapon_select.item_count - 1)
	if editor.canvas: editor.canvas.queue_redraw()

func _create_skin() -> void:
	var name := skin_name.text.strip_edges()
	if SkinManagerClass.create_skin(editor.project, name):
		editor.project.active_skin = name; skin_name.clear(); _status("Skin criada: " + name); refresh()
	else: _status("Nome inválido ou skin já existe")

func _on_skin_selected(index: int) -> void:
	if editor == null or skin_select.item_count == 0: return
	editor.project.active_skin = skin_select.get_item_text(index); _status("Skin ativa: " + editor.project.active_skin); refresh()

func _choose_skin_texture() -> void:
	if editor.selected_kind != "piece" or editor.selected_id.is_empty(): _status("Selecione uma peça do personagem primeiro"); return
	skin_dialog.popup_centered_ratio(0.7)

func _on_skin_texture_selected(path: String) -> void:
	var used := _project_asset_path(path)
	SkinManagerClass.set_piece_texture(editor.project, editor.project.active_skin, editor.selected_id, used)
	_status("PNG substituído apenas em " + editor.project.active_skin); refresh()

func _clear_skin_texture() -> void:
	if editor.selected_kind != "piece" or editor.selected_id.is_empty(): _status("Selecione uma peça primeiro"); return
	SkinManagerClass.set_piece_texture(editor.project, editor.project.active_skin, editor.selected_id, ""); _status("Peça voltou ao PNG original"); refresh()

func _choose_weapon_texture() -> void:
	weapon_dialog.popup_centered_ratio(0.7)

func _on_weapon_texture_selected(path: String) -> void:
	var used := _project_asset_path(path)
	var name := weapon_name.text.strip_edges()
	if name.is_empty(): name = path.get_file().get_basename()
	var socket := weapon_socket.text.strip_edges()
	if socket.is_empty(): socket = "RightHand"
	var id := WeaponManagerClass.register_weapon(editor.project, {"name":name,"texture":used,"socket":socket,"offset":[0.0,0.0],"rotation":0.0,"scale":[1.0,1.0]})
	editor.project.equipped_weapon = id
	_status("Arma registrada e equipada: " + name); weapon_name.clear(); refresh()

func _equip_selected() -> void:
	if weapon_select.item_count == 0: return
	var id: String = weapon_select.get_item_metadata(weapon_select.selected)
	if WeaponManagerClass.equip(editor.project, id): _status("Equipamento atualizado"); refresh()

func _unequip() -> void:
	WeaponManagerClass.equip(editor.project, ""); _status("Arma removida do preview"); refresh()

func _project_asset_path(path: String) -> String:
	if editor.project.project_path.is_empty(): return path
	return ProjectStoreClass.copy_sprite_to_project(path, editor.project.project_path.get_base_dir())

func _status(text: String) -> void:
	info.text = text
	if editor.has_method("_set_status"): editor.call("_set_status", text)
