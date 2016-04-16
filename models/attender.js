/**
 * Created by rubenschmidt on 07.04.2016.
 */
// Constructor
function Attender(id, nickName ,points) {
    // always initialize all instance properties
    this.id = id;
    this.points = points;
    this.nickName = nickName;
    this.ready = false;
}
// class methods
//Game.prototype.getId = function() {
//    return this.id;
//};

module.exports = Attender;