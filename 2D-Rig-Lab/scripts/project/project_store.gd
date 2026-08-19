class_name ProjectStore
extends RefCounted

static func save_project(project: RigProject, file_path: String) -> Error:
	var dir_path := file_path.get_base_dir()
	if not DirAccess.dir_exists_absolute(dir_path):
		var err := DirAccess.make_dir_recursive_absolute(dir_path)
		if err != OK:
			return err
	var file := FileAccess.open(file_path, FileAccess.WRITE)
	if file == null:
		return FileAccess.get_open_error()
	file.store_string(JSON.stringify(project.to_dict(), "\t"))
	file.close()
	project.project_path = file_path
	return OK

static func load_project(file_path: String) -> RigProject:
	if not FileAccess.file_exists(file_path):
		return null
	var file := FileAccess.open(file_path, FileAccess.READ)
	if file == null:
		return null
	var text := file.get_as_text()
	file.close()
	var parsed = JSON.parse_string(text)
	if typeof(parsed) != TYPE_DICTIONARY:
		return null
	var project := RigProject.new()
	project.from_dict(parsed)
	project.project_path = file_path
	return project

static func copy_sprite_to_project(source_path: String, project_dir: String) -> String:
	var sprites_dir := project_dir.path_join("sprites")
	DirAccess.make_dir_recursive_absolute(sprites_dir)
	var base := source_path.get_file()
	var dest := sprites_dir.path_join(base)
	var suffix := 1
	while FileAccess.file_exists(dest):
		dest = sprites_dir.path_join("%s_%d.%s" % [base.get_basename(), suffix, base.get_extension()])
		suffix += 1
	var src := FileAccess.open(source_path, FileAccess.READ)
	if src == null:
		return source_path
	var dst := FileAccess.open(dest, FileAccess.WRITE)
	if dst == null:
		return source_path
	dst.store_buffer(src.get_buffer(src.get_length()))
	src.close()
	dst.close()
	return dest
