
//---------------------------------------------
// 主要変数定義(本当は必要なもの以外は各関数内が良さげだけども)
var doc = app.activeDocument;
var sels = doc.selection;
var artboards = doc.artboards;
// tilesizeは出力元タイルサイズの値
// つまり出力元データのタイルが512pxなどなら512に設定
var tilesize = 256;
// imgsizeが画像サイズの値
// 一旦256でアートボードを用意した後、
// 256とimgsizeの比率で出力画像の倍率を調整
var imgsize = 512;
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
    // -yじゃなくてyだと思うので修正
    // 仕様上-yで正しいみたい
    rect[2] = width + x;
    rect[3] = y - height;
    return rect;
}

//---------------------------------------------
// 一時的な出力用アートボードを内部的に作成
function newArtboard(rect, name) {
    var newArtBoard = artboards.add(rect);
    newArtBoard.name = name;
}
//---------------------------------------------
// mkdirZXYを終えた後にuseopt内で実行、画像出力
function exportPNG() {
    //---------------------------------------------
    // 各変数の調整
    // まずZレベルの倍率比を求める(Z'/Z)
    level_magnification = Math.pow(2,( export_z - base_tileZ ));
    // 次に画像サイズ倍率を求める(pngsize/256)
    // タイルサイズと画像サイズを別にすることで、高画質需要に応答
    img_magnification = imgsize / 256;
    // 出力するXフォルダ数を算出
    // 出力元/タイルサイズは今のアートボードをそのまま分割した場合
    // そこに倍率比をかけあわせる
    // 例えば出力元z14、出力先z16なら、倍率は2^2
    // この出力元アートボードが(w,h)=(4096,2304)=(256*16,256*9)とする
    // 出力元そのままなら、16個のXフォルダが必要
    // z14からz16に拡大出力された場合、縦横辺と必要なXフォルダ数は2^2倍される
    // つまり16*2^(16-14)=16*4=64個のXフォルダが必要
    // math.floorは切り捨て処理
    export_dirXcount = (Math.floor( base_rectW / tilesize )) * level_magnification;
    // 同様に、出力するY.png数を算出
    export_dirYcount = (Math.floor( base_rectH / tilesize )) * level_magnification;
    //---------------------------------------------
    // フォルダを作成
    mkdirZXY();
    //---------------------------------------------
    // Math.pow(2,3)なら2*2*2
    // var numberOfTiles = Math.pow(2, scale) * Math.pow(2, scale);
    // 出力元がz14、出力先がz16なら、4倍の比率がある
    // そこで、z14を256/4=64ずつ区切り、タイル出力時に4倍にする
    // なお、tilesize≠pngsize
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
    artboards.setActiveArtboardIndex(tmp);
    for (var ix = 0; ix < export_dirXcount + 1; ix++){
        // xフォルダごとに出力していく
        if (ix > 0) {
            x += base_cell;
        }
        var y = - activeboards.artboardRect[1];
        // 左上だし、0じゃなくて1だと思う
        // activeboards.artboardRect[1]はなぜかマイナスなので注意
        for (var iy = 0; iy < export_dirYcount; iy++) {
            // ycountを超えたら終了、次へ進む
            // 2周目からはyにbase_cellを足していく
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
            // これらの設定に基づいて画像出力
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
    // OKを押すと終了
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
    var input_base_tileZ = win.add('edittext', undefined, "12");
    win.add('statictext', undefined, "(2)制作アートボードの設計左上のタイル座標xを指定してください");
    var input_base_tileX = win.add('edittext', undefined, "3637");
    win.add('statictext', undefined, "(3)制作アートボードの設計左上のタイル座標yを指定してください");
    var input_base_tileY = win.add('edittext', undefined, "1612");
    // ちなみに、z12,x3637,y1612は東京都庁の庁舎
    win.add('statictext', undefined, "----------");
    win.add('statictext', undefined, "STEP2.出力したいタイルデータについて");
    win.add('statictext', undefined, "出力先タイルの希望ズームレベルz'を指定してください");
    var input_export_Z = win.add('edittext', undefined, "16");
    //---------------------------------------------
    win.confirmBtn = win.add('button', undefined, "OK", {
        name: 'confirm'
    }).onClick = function() {
        // 10進数で書かれたzoomInput.textを数値に変換し、整数に繰り上げる。
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
    // アクティブなアートボードを呼び出す
    index = doc.artboards.getActiveArtboardIndex()
    activeboards = doc.artboards[index];
    // 0,1,2,3は左上のx,左上のy,右下のx,右下のy
    base_rectW = activeboards.artboardRect[2] - activeboards.artboardRect[0];
    base_rectH = - (activeboards.artboardRect[3] - activeboards.artboardRect[1]);
    // y軸方向はマイナスになる仕様？
    // 準備ができたら情報入力画面へ
    useropt();
}

//---------------------------------------------
// ここからユーザー操作
// ドキュメントが開かれていて、かつ保存されていれば実行
if (app.documents.length > 0) {
    doc = app.activeDocument;
    if (!doc.saved) {
        Window.alert("ドキュメントが保存されていません");
    } else {
        go();
    }
} else {
    Window.alert("ドキュメントが開かれていません");
}