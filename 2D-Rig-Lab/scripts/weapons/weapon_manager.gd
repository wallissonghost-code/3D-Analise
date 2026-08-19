class_name WeaponManager
extends RefCounted

static func register_weapon(project: RigProject, data: Dictionary) -> String:
	var id: String = data.get("id", "")
	if id.is_empty(): id = "weapon_%d" % Time.get_ticks_msec()
	var item := {"id":id,"name":data.get("name","Weapon"),"texture":data.get("texture",""),"socket":data.get("socket","RightHand"),"offset":data.get("offset",[0.0,0.0]),"rotation":data.get("rotation",0.0),"scale":data.get("scale",[1.0,1.0]),"z_index":data.get("z_index",100)}
	for i in range(project.weapons.size()):
		if project.weapons[i].get("id","")==id:
			project.weapons[i]=item;return id
	project.weapons.append(item)
	return id

static func remove_weapon(project: RigProject, id: String) -> bool:
	for i in range(project.weapons.size()-1,-1,-1):
		if project.weapons[i].get("id","")==id:
			project.weapons.remove_at(i)
			if project.equipped_weapon==id: project.equipped_weapon=""
			return true
	return false

static func find_weapon(project: RigProject, id: String) -> Dictionary:
	for weapon in project.weapons:
		if weapon.get("id","")==id:return weapon
	return {}

static func equip(project: RigProject, id: String) -> bool:
	if id.is_empty(): project.equipped_weapon="";return true
	if find_weapon(project,id).is_empty(): return false
	project.equipped_weapon=id;return true

static func list_names(project: RigProject) -> Array[String]:
	var out:Array[String]=[]
	for weapon in project.weapons:out.append(weapon.get("name","Weapon"))
	return out
