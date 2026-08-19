class_name EditorHistory
extends RefCounted

var undo_stack: Array[Dictionary] = []
var redo_stack: Array[Dictionary] = []

func push(label: String, before: Dictionary, after: Dictionary) -> void:
	undo_stack.append({"label": label, "before": before.duplicate(true), "after": after.duplicate(true)})
	redo_stack.clear()
	if undo_stack.size() > 100:
		undo_stack.pop_front()

func undo() -> Dictionary:
	if undo_stack.is_empty():
		return {}
	var action: Dictionary = undo_stack.pop_back()
	redo_stack.append(action)
	return action["before"].duplicate(true)

func redo() -> Dictionary:
	if redo_stack.is_empty():
		return {}
	var action: Dictionary = redo_stack.pop_back()
	undo_stack.append(action)
	return action["after"].duplicate(true)

func clear() -> void:
	undo_stack.clear()
	redo_stack.clear()
