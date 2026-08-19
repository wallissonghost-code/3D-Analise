class_name RigExporter
extends RefCounted

static func export_clean_json(project: RigProject, output_path: String) -> Error:
	var payload := project.to_dict()
	payload["character"] = project.project_name
	payload.erase("project_name")
	var dir := output_path.get_base_dir()
	DirAccess.make_dir_recursive_absolute(dir)
	var file := FileAccess.open(output_path, FileAccess.WRITE)
	if file == null:
		return FileAccess.get_open_error()
	file.store_string(JSON.stringify(payload, "\t"))
	file.close()
	return OK

# Sprite-sheet and frame PNG export are intentionally isolated here for Priority 3.
# The MVP does not rasterize animation frames yet; this class is the extension point.
