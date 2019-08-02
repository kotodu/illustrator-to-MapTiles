
//---------------------------------------------
// 主要変数定義
var doc = app.activeDocument;
var sels = doc.selection;
var artboards = doc.artboards;
var tilesize = 256;
var base_tileZ
var base_tileX
var base_tileY
var base_rectX
var base_rectW
var base_rectH
var export_dir
var export_z
var base_cell
var base_cellX
var base_cellY
var export_dirXcount
var export_dirYcount
var level_magnification
var options = new ExportOptionsPNG24();
// エクスポート領域をアートボードの大きさに
options.artBoardClipping = true;

//---------------------------------------------
// x,y,w,hからイラレ向けのrectに変換する関数
function getRect(x, y, width, height) {
    // イラレのartboardは左上x,左上y,右下x,右下yを指定して作成
    // x,y,w,hを入力し、イラレ向けの値に変換して出力する
    var rect = [];
    rect[0] = x;
    rect[1] = y;/* -yじゃなくてyだと思うので修正 */
    rect[2] = width + x;
    rect[3] = height + y;/* チョット修正 */
    return rect;
}

//---------------------------------------------
// 一時的な出力用アートボードを内部的に作成
function newArtboard(rect, name) {
    var newArtBoard = doc.artboards.add(rect);
    newArtBoard.name = name;
}
//---------------------------------------------
// mkdirZXYを終えた後にuseopt内で実行、臥像出力
function exportPNG() {
    // Math.pow(2,3)なら2*2*2
    // var numberOfTiles = Math.pow(2, scale) * Math.pow(2, scale);
    // 出力元がz14、出力先がz16なら、4倍の比率がある
    // そこで、z14を256/4=64ずつ区切り、タイル出力時に4倍にする
    base_cell = 256 / level_magnification
    // ExportOptionsPNG24では、倍率を指定して出力できる
    // horizontalScale,verticalScaleは横,縦の倍率指定(%指定)
    options.horizontalScale = level_magnification * 100;
    options.verticalScale = level_magnification * 100;
    // var cols = Math.sqrt(numberOfTiles);
    // var size = width / cols;
    var x = parentArtboard.artboardRect[0];

    // 二重のforを行う。縦方向に出力していき、xフォルダ満杯になったら1つ横へ
    for (var ix = 0; ix < export_dirXcount + 1; ix++){
        // xフォルダごとに出力していく
        if (ix > 0) {
            x += base_cell;
        }
        for (var iy = 0; iy < export_dirYcount + 1; iy++) {
            // ycountを超えたら終了、次へ進む
            var y = parentArtboard.artboardRect[1];/* 左上だし、0じゃなくて1だと思う */
            // 2周目からはyにbase_cellを足していく
            if (iy > 0) {
                y += base_cell;
            }
            // x,yに新たに一時アートボードを生成
            newArtboard(getRect(x, y, size, size), 'tmp-artboard');
            doc.artboards.setActiveArtboardIndex(1);
            // ファイル名は出力先フォルダ/z/x/y.png
            var newFileName = export_dir + "/" + export_z + '/' + count_x  + '/' + count_y + '.png';
            var newFile = new File(newFileName);
            // これらの設定に基づいて画像出力
            doc.exportFile(newFile, ExportType.PNG24, options);
            // で一旦アートボードを消す
            doc.artboards.remove(1);
        }
    }
}

//---------------------------------------------
// 必要なフォルダを作成する。useropt()の終わりで実行
function mkdirZXY(path) {
    // var path = export_dir;
    path = path.toString();
    // zフォルダ生成
    var folderZ = new Folder(path + "/" + export_z);
    if (!folderZ.exists){
        folderZ.create();
    };
    //---------------------------------------------
    // まずZレベルの倍率比を求める
    level_magnification = 2^( export_z - base_tileZ );
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
    // mkdirZXYでは使わないが、準備しておく
    export_dirYcount = (Math.floor( base_rectH / tilesize )) * level_magnification;
    //---------------------------------------------
    // xフォルダ作成
    // 初期値はbase_tileX*倍率比、dirXcountを超えたら終了
    for (var i = base_tileX * level_magnification; i < export_dirXcount+ 1; i++) {
        var fullPath = path + "/" + export_z + "/" + i;
        // path/zの下に1つずつxフォルダを作成
        var folder = new Folder(fullPath);
        if (!folder.exists) folder.create();
    }
    return;
}

//---------------------------------------------
// 情報入力画面、go()の次に実行される
function useropt() {
    var win = new Window('dialog', "Options");
    win.add('statictext', undefined, "STEP1.出力元アートボード自体について");
    win.add('statictext', undefined, "(1)アートボードの設計ズームレベルを指定してください");
    var input_base_tileZ = win.add('edittext', undefined, "14");
    win.add('statictext', undefined, "(2)アートボード左上のタイル座標Xを指定してください");
    var input_base_tileX = win.add('edittext', undefined, "14549");
    win.add('statictext', undefined, "(3)アートボード左上のタイル座標Yを指定してください");
    var input_base_tileY = win.add('edittext', undefined, "6451");
    // z14,x14549,y6451は東京都庁の庁舎
    win.add('statictext', undefined, "STEP2.出力先タイルのズームレベルを指定してください");
    var input_export_z = win.add('edittext', undefined, "16");
    //---------------------------------------------
    win.confirmBtn = win.add('button', undefined, "Generate", {
        name: 'confirm'
    }).onClick = function() {
        // 10進数で書かれたzoomInput.textを数値に変換し、整数に繰り上げる。
        base_tileZ = Math.ceil(parseInt(input_base_tileZ.text, 10));
        /* ||2ってあったけど、理解できず不要に見えたので削除 */
        base_tileX = Math.ceil(parseInt(input_base_tileX.text, 10));
        base_tileY = Math.ceil(parseInt(input_base_tileY.text, 10));
        export_z = Math.ceil(parseInt(input_export_z.text, 10));
        win.close();
        export_dir = Folder.selectDialog('STEP3.画像の出力先フォルダを選択してください');
        if (export_dir){
            // パスが指定されていれば、その下にZとXフォルダを生成
            mkdirZXY(export_dir);
            exportPNG();
        }
    }
    win.add('button', undefined, "Cancel", {
        name: 'cancel'
    }).onClick = function() {
        win.close();
    }
    win.show()
}
//---------------------------------------------



//---------------------------------------------
// スクリプト起動時に問題なければ、最初に実行される関数
function go() {
    // これって選択されているアートボード？なのだろうか。
    parentArtboard = doc.artboards[0];
    // おそらく0,1,2,3は左上のx,左上のy,右下のx,右下のyかな
    // Wは左上のy
    base_rectW = parentArtboard.artboardRect[2] - parentArtboard.artboardRect[0];/* [1]-[0]だったけれど、2-0のミスだと思うので修正 */
    base_rectH = parentArtboard.artboardRect[3] - parentArtboard.artboardRect[1];
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