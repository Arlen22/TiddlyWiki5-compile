const Observable = require('rxjs').Observable;
const fs = require('fs');
const path = require('path');

function obs_stat(tag) {
    return Observable.bindCallback(fs.stat, (err, stat) => [err, stat, tag])
}

function obs_readdir(tag) {
    return Observable.bindCallback(fs.readdir, (err, files) => [err, files, tag]);
}

function obs_readFile(tag) {
    return Observable.bindCallback(fs.readFile, (err, data) => [err, data, tag]);
}
function obs_mkdir(tag) {
    return Observable.bindCallback(fs.mkdir, (err, data) => [err, data, tag]);
}
var $tw = require("tiddlywiki").TiddlyWiki();

$tw.boot.argv = ['node_modules/tiddlywiki/editions/empty']

const execute = $tw.boot.executeNextStartupTask;
$tw.boot.executeNextStartupTask = function() {
    if(!execute()) complete();
    return true;
}
$tw.boot.boot();
function complete() {
    require('./boot-node').bootNode($tw);
    Observable.from(['plugins', 'themes']).concatMap(folder => {
        const fullpath = path.join(__dirname, 'node_modules/tiddlywiki', folder);
        return obs_readdir(fullpath)(fullpath);
    }).concatMap(([err, files, folder]) => {
        //read the author folders
        return Observable.from(files).map(author => {
            return path.join(folder, author);
        })
    }).startWith(path.join(__dirname, 'node_modules/tiddlywiki', 'languages')).concatMap(fullpath => {
        return obs_readdir(fullpath)(fullpath);
    }).concatMap(([err, files, folder]) => {
        return Observable.from(files).map(plugin => {
            return path.join(folder, plugin);
        })
    }).startWith(path.join(__dirname, 'node_modules/tiddlywiki', 'core')).concatMap(fullpath => {
        return $tw.loadPluginFolder(fullpath).map(a => [a, fullpath]);
        //return Observable.of([$tw.loadPluginFolder(fullpath), fullpath]);
    }).subscribe(([plugin, oldpath]) => {
        const relPath = path.normalize(path.relative(path.join(__dirname, 'node_modules', 'tiddlywiki'), oldpath));
        console.log(relPath);
        const newPath = path.join(__dirname, "compiled", relPath);
        console.log(newPath);
        const splitPath = relPath.split(path.sep);
        for (let i = 0; i < splitPath.length; i++) {
            const curPath = path.join(__dirname, "compiled", splitPath.slice(0, i + 1).join(path.sep));
            if (!fs.existsSync(curPath)) fs.mkdirSync(curPath);
        }
        if (plugin) { 
            plugin.tiddlers = JSON.parse(plugin.text).tiddlers;
            delete plugin.text;
            fs.writeFileSync(path.join(newPath, "plugin.info"), JSON.stringify(plugin)); 
        }
        else console.log(oldpath);
    })
}

