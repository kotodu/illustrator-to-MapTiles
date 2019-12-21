// ai2tiles.jsx
// version : 1.2.2
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
var doc = app.activeDocument;
var sels = doc.selection;
var artboards = doc.artboards;
// tilesizeは出力元タイルサイズの値
// つまり出力元データのタイルが512pxなどなら512に設定
// ここはあまりいじらない方が良い
var tilesize = 256;
var img_magnification;
var base_tileZ
var base_tileX
var base_tileY
var base_rectX
var base_rectW
var base_rectH
var export_dir
var export_z
var export_x
var export_y
var base_cell
var base_cellX
var base_cellY
var export_dirXcount
var export_dirYcount
var level_magnification
var index
var options = new ExportOptionsPNG24();
// エクスポート領域をアートボードの大きさに->true
options.artBoardClipping = true;
// 実行し始める時点でのアートボード数を記録
var tmp = artboards.length;
//---------------------------------------------
// x,y,w,hからイラレ向けのrectに変換する関数
function getRect(x, y, width, height) {
    // イラレのartboardは左上x,左上y,右下x,右下yを指定して作成
    // x,y,w,hを入力し、イラレ向けの値に変換して出力する
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
}
//---------------------------------------------
function exportPNG() {
    //---------------------------------------------
    // まずZレベルの倍率比を求める(Z'/Z)
    level_magnification = Math.pow(2,( export_z - base_tileZ ));
    // 次に画像サイズ倍率を求める(pngsize/256)
    // タイルサイズと画像サイズを別にすることで、高画質需要に応答
    img_magnification = imgsize / 256;
    // 出力するXフォルダ数を算出
    export_dirXcount = (Math.floor( base_rectW / tilesize )) * level_magnification;
    // 同様に、出力するY.png数を算出
    export_dirYcount = (Math.floor( base_rectH / tilesize )) * level_magnification;
    //---------------------------------------------
    // フォルダを作成
    mkdirZXY();
    //---------------------------------------------
    // Math.pow(2,3)なら2*2*2
    // 出力元がz14、出力先がz16なら、4倍の比率がある
    // そこで、z14を256/4=64ずつ区切り、タイル出力時に4倍にする
    base_cell = tilesize / level_magnification;
    // ExportOptionsPNG24では、倍率を指定して出力できる
    // horizontalScale,verticalScaleは横,縦の倍率指定(%指定)
    options.horizontalScale = level_magnification * img_magnification * 100;
    options.verticalScale = level_magnification * img_magnification * 100;
    var x = activeboards.artboardRect[0];
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
    for (var ix = 0; ix < export_dirXcount; ix++){
        if (ix > 0) {
            x += base_cell;
        }
        var y = - activeboards.artboardRect[1];
        for (var iy = 0; iy < export_dirYcount; iy++) {
            if (iy > 0) {
                y += base_cell;
            }
            // ファイル名は出力先フォルダ/z/x/y.png
            // 一時アートボードを移動させる
            artboards[tmp].artboardRect = getRect(x,-y, base_cell, base_cell);
            export_x = base_tileX * level_magnification;
            export_y = base_tileY * level_magnification;
            var newFileName = export_dir + "/" + export_z + '/' + (export_x + ix) + '/' + (export_y + iy) + '.png';
            var newFile = new File(newFileName);
            doc.exportFile(newFile, ExportType.PNG24, options);
        }
    }
    artboards.remove(tmp);
    return
}

//---------------------------------------------
// 必要なフォルダを作成する。useropt()の終わりで実行
function mkdirZXY() {
    export_dir = Folder.selectDialog('STEP3.画像の出力先フォルダを選択してください');
    if(export_dir != 0) {
        var path = export_dir;
        path = path.toString();
    } else{
        return
    }
    // zフォルダ生成
    var folderZ = new Folder(path + "/" + export_z);
    if (!folderZ.exists){
        folderZ.create();
    };
    //---------------------------------------------
    // xフォルダ作成
    // 初期値はbase_tileX*倍率比、dirXcountを超えたら終了
    for (var i = 0; i < export_dirXcount; i++) {
        var fullPath = path + "/" + export_z + "/" + (base_tileX * level_magnification + i );
        // path/zの下に1つずつxフォルダを作成
        var folder = new Folder(fullPath);
        if (!folder.exists) folder.create();
    }
    return export_dir;
}

//---------------------------------------------
// 終了時動作
function end(){
    var win = new Window('dialog', "press OK");
    win.add('statictext', undefined, "実行が完了しました");
    win.confirmBtn = win.add('button', undefined, "OK", {
        name: 'confirm'
    }).onClick = function() {
        win.close();
    }
    win.show();
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
    win.confirmBtn = win.add('button', undefined, "OK", {
        name: 'confirm'
    }).onClick = function() {
        base_tileZ = Math.ceil(parseInt(input_base_tileZ.text, 10));
        base_tileX = Math.ceil(parseInt(input_base_tileX.text, 10));
        base_tileY = Math.ceil(parseInt(input_base_tileY.text, 10));
        export_z = Math.ceil(parseInt(input_export_Z.text, 10));
        win.close();
        exportPNG();
        end();
    }
    win.add('button', undefined, "Cancel", {
        name: 'cancel'
    }).onClick = function() {
        win.close();
    }
    win.show()
}

//---------------------------------------------
// スクリプト起動時に問題なければ、最初に実行される関数
function go() {
    index = doc.artboards.getActiveArtboardIndex()
    activeboards = doc.artboards[index];
    // 0,1,2,3は左上のx,左上のy,右下のx,右下のy
    base_rectW = activeboards.artboardRect[2] - activeboards.artboardRect[0];
    base_rectH = - (activeboards.artboardRect[3] - activeboards.artboardRect[1]);
    // y軸方向はマイナスになる仕様？
    useropt();
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