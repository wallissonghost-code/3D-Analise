class_name WeaponData
extends RefCounted

var id := ""
var name := "Weapon"
var texture := ""
var socket := "RightHand"
var offset := Vector2.ZERO
var rotation := 0.0
var scale := Vector2.ONE

func to_dict() -> Dictionary:
	return {"id":id,"name":name,"texture":texture,"socket":socket,"offset":[offset.x,offset.y],"rotation":rotation,"scale":[scale.x,scale.y]}
