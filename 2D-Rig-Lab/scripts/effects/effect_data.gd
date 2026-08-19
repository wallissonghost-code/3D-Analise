class_name EffectData
extends RefCounted

var id := ""
var name := "Effect"
var enabled := true
var socket := "Body"
var texture := ""
var offset := Vector2.ZERO
var rotation := 0.0
var scale := Vector2.ONE
var parameters: Dictionary = {}

func to_dict() -> Dictionary:
	return {"id":id,"name":name,"enabled":enabled,"socket":socket,"texture":texture,"offset":[offset.x,offset.y],"rotation":rotation,"scale":[scale.x,scale.y],"parameters":parameters.duplicate(true)}
