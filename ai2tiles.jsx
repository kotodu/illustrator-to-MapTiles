// ai2tiles.jsx
// version : 1.2.3
// Copyright : kotodu(busroutemap)
// Licence : MIT
// github : https://github.com/busroutemap/illustrator-to-MapTiles

//---------------------------------------------
// ユーザーによるカスタマイズ可能変数
// (1)imgsize : 画像サイズの値(px)
    // ここで決めたサイズの正方形として地図タイルは出力される
    // 内部的には、一旦256でアートボードを用意した後、256とimgsizeの比率で出力画像の倍率を調整する。
var imgsize = 512;

// (2)出力元データの各種既定値
    // つまりZ,X,Y、アートボードのデータ
    // XとYで迷う人向けに。Xはフォルダ名、Yは画像名
    // 因みにこの値は鳥取市の名勝・白兎海岸
var defZ = 15;
var defX = 28590;
var defY = 12918;

// (3)出力先既定Zレベル既定値
    // つまりZ'、出力したい地図タイルのズームレベル
var defZZ = 15;

//---------------------------------------------
// 主要変数定義(本当は必要なもの以外は各関数内が良いのだけれども)
// tilesizeは出力元タイルサイズの値
// つまり出力元データのタイルが512pxなどなら512に設定
// ここはあまりいじらない方が良い
var tilesize = 256;
//---------------------------------------------
// 出力するタイル画像についての設定
// JPEG用はコメントアウト
// var options = new ExportOptionsJPEG();
// 一応。JPEG出力画質設定は0-100
// options.qualitySetting=100;
var options = new ExportOptionsPNG24();
// PNG用、透過するかどうか
// options.transparency=true;
// 以下は共通
// エクスポート領域をアートボードの大きさに->true
options.artBoardClipping = true;
// options.antiAliasing = true;
// options.matte = true;
// var matteColor = new RGBColor();
// matteColor.red=255;
// matteColor.green=255;
// matteColor.blue=255;
// options.matteColor=matteColor;

//---------------------------------------------
// よく使いすぎるものは全体で定義
var doc = app.activeDocument;
var artboards = doc.artboards;
//---------------------------------------------
// 実行し始める時点でのアートボード数を記録
var tmp = artboards.length;
//---------------------------------------------
// クラスを用いた変更
// INPUTに利用者独自設定を反映させる
// INPUTを踏まえてBASEで出力範囲と出力仕様を確定させる

var Input = (function (z, x, y, zz, tileoptions) {
    
    // コンストラクタ
    if(!(this instanceof Input)) {
        return new Input(z, x, y, zz, tileoptions);
    }
    var i = Input.prototype;
    
    i.setZ = function (z) {
        if (z < 8 || z > 20) {
            // 不正な値
            this.z = 888;
        } else {
            this.z = Math.ceil(z);
        }
    }
    i.setX = function (x) {
        if (x < 0) {
            // 不正な値
            this.x = 888;
        } else {
            this.x = Math.ceil(x);
        }
    }
    i.setY = function (y) {
        if (y < 0) {
            // 不正な値
            this.y = 888;
        } else {
            this.y = Math.ceil(y)
        }
    }
    i.setZZ = function (zz) {
        if (zz < 8 || zz > 20) {
            // 不正な値
            this.zz = 888;
        } else {
            this.zz = Math.ceil(zz);
        }
    }
    i.setOptions = function (tileoptions) {
        if (tileoptions) {
            
        }
    }

})();

var Base = (function () {


    // コンストラクタ
    if (!(this instanceof Base)) {
        return new Base();
    }



})();


var OUTPUT;

var ARTBOAD;

//---------------------------------------------
/**
 * 左上のx,yとアートボードのw,hから、左上のx,yと右下のx,yに変換する
 * (＝イラレ向けのrect)。
 * @param {*} x 
 * @param {*} y 
 * @param {*} width 
 * @param {*} height 
 * @return x1,y1,x2,y2
 */
function getRect(x, y, width, height) {
    var rect = [];
    rect[0] = x;
    rect[1] = y;
    // illustratorでのyは特殊なので注意
    rect[2] = width + x;
    rect[3] = y - height;
    return rect;
}

//---------------------------------------------
function newArtboard(rect, name) {
    var newArtBoard = artboards.add(rect);
    newArtBoard.name = name;
    return newArtBoard;
}
//---------------------------------------------
/**
 * ユーザーに画像の出力先フォルダを尋ねる
 * mkdirZXYを分割しZフォルダだけ質問後に作るように
 */
function askPath(ZXYZ){
    var export_z = ZXYZ[3];
    // 必要なフォルダを作成する
    var export_dir = Folder.selectDialog('STEP3.画像の出力先フォルダを選択してください');
    if(!(export_dir===null)) {
        var path = export_dir;
        path = path.toString();
    } else{
        // 処理中止
        return 
    }
    // zも含めてpath
    var exportPath = export_dir + "/" + export_z;
    // 
    var folderZ = new Folder(exportPath);
    if (!folderZ.exists){
        folderZ.create();
    };
    return exportPath;
}
//---------------------------------------------
/**
 * 
 * @param {*} path 
 * @param {*} examinedAreaData [X,Y,W,H]
 * @param {*} ZXYZ [Z,X,Y,Z']
 */
function exportPNG(path,examinedAreaData,ZXYZ) {
    var exportArea = examinedAreaData;
    var exportZXYZ = ZXYZ;
    // Zレベルの倍率比を求める(Z'/Z)
    var level_magnification = Math.pow(2,( exportZXYZ[3] - exportZXYZ[0] ));
    // 次に画像サイズ倍率を求める(pngsize/256)
    // タイルサイズと画像サイズを別にすることで、高画質需要に応答
    var img_magnification = imgsize / 256;
    // 出力するXフォルダ数を算出
    var export_dirXcount = (Math.floor( exportArea[2] / tilesize )) * level_magnification;
    // 同様に、出力するY.png数を算出
    var export_dirYcount = (Math.floor( exportArea[3] / tilesize )) * level_magnification;
    //---------------------------------------------
    // Math.pow(2,3)なら2*2*2
    // 出力元がz14、出力先がz16なら、4倍の比率がある
    // そこで、z14を256/4=64ずつ区切り、タイル出力時に4倍にする
    var base_cell = tilesize / level_magnification;
    // ExportOptionsPNG24では、倍率を指定して出力できる
    // horizontalScale,verticalScaleは横,縦の倍率指定(%指定)
    options.horizontalScale = level_magnification * img_magnification * 100;
    options.verticalScale = level_magnification * img_magnification * 100;
    // 最初は左上から、export_tileのXとYが動いていく
    var export_tileX = exportZXYZ[1] * level_magnification;
    var export_tileY = exportZXYZ[2] * level_magnification;
    // 二重の繰り返し処理を行う
    // 縦方向に出力していき、xフォルダ満杯になったら次のxフォルダへ
    // 一時用アートボードを新規作成
    newArtboard(getRect(0,0,base_cell,base_cell),"tmp");
    // ArtboardIndexはゼロベース
    // tmp、つまり初期時点でのartboards.lengthは非ゼロベース
    // tmp+1ではなくtmpのままでOK
    // 一時アートボードはこの時点で、まだ座標0,0にいる
    artboards.setActiveArtboardIndex(tmp);
    //---------------------------------------------
    // ここからループ処理
    var x = exportArea[0];
    for (var ix = 0; ix < export_dirXcount; ix++){
        if (ix > 0) {
            x += base_cell;
        }
        var fullPath = path + "/" +  (export_tileX + ix );
        // もしなければ、xフォルダを作成
        var folder = new Folder(fullPath);
        if (!folder.exists) {
            folder.create();
        }
        var y = exportArea[1];
        for (var iy = 0; iy < export_dirYcount; iy++) {
            if (iy > 0) {
                y += base_cell;
            }
            // ファイル名は出力先フォルダ/z/x/y.png
            // このうちzはpathで指定済み
            // 一時アートボードを移動させる
            artboards[tmp].artboardRect = getRect(x,-y, base_cell, base_cell);
            var newFileName = path + '/' + (export_tileX + ix) + '/' + (export_tileY + iy) + '.png';
            var newFile = new File(newFileName);
            doc.exportFile(newFile, ExportType.PNG24, options);
        }
    }
    artboards.remove(tmp);
    return
}
//---------------------------------------------
/**
 * アートボードの判定や最終調整を行う予定。細かな処理は今後実装。
 * @param {*} ZXYZ [Z,X,Y,Z']
 * @returns [X,Y,W,H]
 */
function examineArea(ZXYZ){
    // まず、アクティブなアートボードの判定を行う
    var index = artboards.getActiveArtboardIndex();
    var activeboards = artboards[index];
    // 0,1,2,3は左上のx,左上のy,右下のx,右下のy
    var areaW = activeboards.artboardRect[2] - activeboards.artboardRect[0];
    var areaH = - (activeboards.artboardRect[3] - activeboards.artboardRect[1]);
    // 判定しエクスポートするRectDataをリターンする
    // 判定部分は今後実装する
    var areaX = activeboards.artboardRect[0];
    var areaY = - activeboards.artboardRect[1];
    return [areaX,areaY,areaW,areaH];
}
//---------------------------------------------
/**
 * 終了時処理をまとめたもの。
 * 引数や戻りなく、終了した旨を告知するのみ
 */
function end(){
    var win = new Window('dialog', "press OK");
    win.add('statictext', undefined, "実行が完了しました");
    win.confirmBtn = win.add('button', undefined, "OK", {
        name: 'confirm'
    }).onClick = function() {
        win.close();
    }
    win.show();
    return;
}
//---------------------------------------------
// 情報入力画面、go()の次に実行される
function useropt() {
    var win = new Window('dialog', "enter options");
    win.add('statictext', undefined, "STEP1.出力元アートボード自体について");
    win.add('statictext', undefined, "(1)制作アートボードの設計ズームレベルzを指定してください");
    var input_base_tileZ = win.add('edittext', undefined, defZ);
    win.add('statictext', undefined, "(2)制作アートボードの設計左上のタイル座標xを指定してください");
    var input_base_tileX = win.add('edittext', undefined, defX);
    win.add('statictext', undefined, "(3)制作アートボードの設計左上のタイル座標yを指定してください");
    var input_base_tileY = win.add('edittext', undefined, defY);
    win.add('statictext', undefined, "----------");
    win.add('statictext', undefined, "STEP2.出力したいタイルデータについて");
    win.add('statictext', undefined, "出力先タイルの希望ズームレベルz'を指定してください");
    var input_export_Z = win.add('edittext', undefined, defZZ);
    //---------------------------------------------
    var base_tileZ;
    var base_tileX;
    var base_tileY;
    var export_z;
    win.confirmBtn = win.add('button', undefined, "OK", {
        name: 'confirm'
    }).onClick = function() {
        base_tileZ = Math.ceil(parseInt(input_base_tileZ.text, 10));
        base_tileX = Math.ceil(parseInt(input_base_tileX.text, 10));
        base_tileY = Math.ceil(parseInt(input_base_tileY.text, 10));
        export_z = Math.ceil(parseInt(input_export_Z.text, 10));
        win.close();
    }
    win.add('button', undefined, "Cancel", {
        name: 'cancel'
    }).onClick = function() {
        win.close();
    }
    win.show();
    return [base_tileZ,base_tileX,base_tileY,export_z];
}

//---------------------------------------------
function go() {
    // スクリプト起動時に問題なければ、最初に実行される関数
    // y軸方向はマイナスになる仕様？
    var ZXYZ = useropt();
    $.writeln(ZXYZ);
    if(!(ZXYZ[0]===undefined)){
        var examinedAreaData = examineArea(ZXYZ);
        var path = askPath(ZXYZ);
    }
    if(!(path===undefined)){
        $.writeln(path);
        exportPNG(path,examinedAreaData,ZXYZ);
    }
    end();
}

//---------------------------------------------
// ここからユーザー操作
// ドキュメントが開かれていて、かつ保存されていれば実行
if (app.documents.length > 0) {
    if (!doc.saved) {
        Window.alert("ドキュメントが保存されていません");
    } else {
        go();
    }
} else {
    Window.alert("ドキュメントが開かれていません");
}