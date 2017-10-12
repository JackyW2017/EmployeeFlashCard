// Initialize app
var myApp = new Framework7();
var db = null;
var serverURL = "";

// If we need to use custom DOM library, let's save it to $$ variable:
var $$ = Dom7;

var cardsTemplate = $$('#cards_template').html();
var compiledCardsTemplate = Template7.compile(cardsTemplate);

// Add view
var mainView = myApp.addView('.view-main', {
    // Because we want to use dynamic navbar, we need to enable it for this view:
    dynamicNavbar: true
});

var pageIndex4Download = 1;
var pageTotal4Download = 1;
var totalPicsCount = 0;
var myAppURL = "";

var CorrectCount = 0;
var InCorrectCount = 0;
var totalPicWaitingDownload = 0;
var currentDownloadPicsIndex = 0;

function runDB(obj) {
    console.log("Execute SQL success.");
}

function errorcb(err) {
    console.log("Error when trying to run DB, Err code is:" + err.code);
}

function openDB(dbName, dbVersion, dbShowName, dbsize) {
    return window.openDatabase(dbName, dbVersion, dbShowName, dbsize);
}

// Handle Cordova Device Ready Event
$$(document).on('deviceready', function() {
    console.log("Device is ready!");
    bindAllButtonEvent();
    myAppURL = cordova.file.dataDirectory;    
    GetFilesCount();
    db = openDB("fcdb.db", "1.0", "FlashDB", 4 * 1024 * 1024);
    checkDBExists(); 
    initMainCards();

    initInCorrectCount();
    initCorrectCount();
    
});

function bindAllButtonEvent()
{
    $$('#hrefUpdatebtn').on('click', function () {
        UpdateURL();
        console.log("Completed hrefUpdatebtn click....");
    });

    $$('#hrefClearCardsBtn').on('click', function () {
        ResetCards();
        console.log("Completed hrefClearCardsBtn click....");
    });

    $$('#hrefGetCardsBtn').on('click', function () {
        GetCardsFromWebServer();
        console.log("Completed GetCardsBtn click....");
    });

    $$('#hrefDeletePics').on('click', function () {
        DeletePics();
        console.log("Completed DeletePics click....");
    });

    $$('#hrefDownloadPics').on('click', function () {
        DownloadPics();
        console.log("Completed DownloadPics click....");
    });

    $$('#hrefRefresh').on('click', function () {
        initMainCards();
        console.log("Completed hrefRefresh click....");
    });

    $$('#hrefRefresh').on('click', function () {
        initMainCards();
        console.log("Completed hrefRefresh click....");
    });

    $$('#hrefRefresh').on('click', function () {
        initMainCards();
        console.log("Completed hrefRefresh click....");
    });

    $$('.item-inner .checkbox_options').on('click', function () {
        clicksOption($$(this));
        console.log("Completed item-inner click....");
    });

}

function initInCorrectCount()
{
    var strSql = "select count(*) as Res from [Cards] where PicDownloaded = 1 and oFlag = 2";
    db.transaction(function (tx) {
        tx.executeSql(strSql, [], function (tx, rs) {
            InCorrectCount = rs.rows.item(0).Res;
            $$("#spnInCorrectCount").html(InCorrectCount);
        });
    });
}

function initCorrectCount()
{
    var strSql = "select count(*) as Res from [Cards] where PicDownloaded = 1 and oFlag = 1";
    db.transaction(function (tx) {
        tx.executeSql(strSql, [], function (tx, rs) {
            CorrectCount = rs.rows.item(0).Res;
            $$("#spnCorrectCount").html(CorrectCount);
        });
    });
}

function HandleCorrect(obj,eid)
{
    CorrectCount++;
    $$("#mark_pic_" + eid).prop("src", "./pic/tick.png");
    $$("#spnCorrectCount").html(CorrectCount);
    var subparent = $$(obj).parent();
    var parent = $$(subparent).parent();
    $$($$(parent).find(".card-content")).attr('style', 'display:none;');
    $$($$(parent).find(".card-footer")).attr('style', 'display:none;');
    $$($$(parent).find(".namespan")).attr('style', 'display:none;');
    var strSql = "Update [Cards] set oFlag = 1 where employeeid='" + eid + "'";
    db.transaction(function (tx) {
        tx.executeSql(strSql);
    });
}

function HandleIncorrect(obj,eid)
{
    InCorrectCount++;
    $$("#mark_pic_" + eid).prop("src", "./pic/wrong.png");
    $$("#spnInCorrectCount").html(InCorrectCount);
    var subparent = $$(obj).parent();
    var parent = $$(subparent).parent();
    $$($$(parent).find(".card-content")).attr('style', 'display:none;');
    $$($$(parent).find(".card-footer")).attr('style', 'display:none;');
    $$($$(parent).find(".namespan")).attr('style', 'display:none;');
    var strSql = "Update [Cards] set oFlag = 2 where employeeid='" + eid + "'";
    db.transaction(function (tx) {
        tx.executeSql(strSql);
    });
}

function clicksOption(obj)
{
    var subparent = $$(obj).parent();
    //console.log("TEST LOG:" + $$(subparent).html());
    RefreshCardsWithOption($$($$(subparent).find("input[name='my-radio']")).prop("value"));
    //myApp.alert("TEST" + $$($$(subparent).find("input[name='my-radio']")).prop("value"), "Debug Message");
}

function RefreshCardsWithOption(myOption)
{
    var cards = { card: [] };
    var strSql = "";
    console.log("In RefreshCards");
    if (myOption < "0")
    {
        strSql = "select * from [Cards] where PicDownloaded = 1";
    }
    else if (myOption == "1")
    {
        strSql = "select * from [Cards] where PicDownloaded = 1 and oFlag = 1";
    }
    else if (myOption == "2")
    {
        strSql = "select * from [Cards] where PicDownloaded = 1 and oFlag = 2";
    }
    else if (myOption == "0")
    {
        strSql = "select * from [Cards] where PicDownloaded = 1 and oFlag = 0";
    }
    console.log("In RefreshCards, strSql " + strSql);
    db.transaction(function (tx) {
        tx.executeSql(strSql, [], function (tx, rs) {

            var len = 0;
            try{
                len = rs.rows.length;
            }
            catch(e)
            {
                console.log("Error on len");
                $$("#mainViewpage").html("");
                return;
            }
           
            //console.log("len is " + len);
            for (var i = 0; i < len; i++) {
                var employeeID = rs.rows.item(i).employeeid;
                //console.log("employeeid is " + employeeID);
                var card = {};
                card.appURL = myAppURL;
                card.employeeid = employeeID;
                card.Name = rs.rows.item(i).Name;
                card.HireDate = rs.rows.item(i).HireDate;
                card.AssignedPosition = rs.rows.item(i).AssignedPosition;
                card.LeftPosition = rs.rows.item(i).LeftPosition;
                card.RightPositio = rs.rows.item(i).RightPositio;
                card.HireType = rs.rows.item(i).HireType;
                card.oFlag = rs.rows.item(i).oFlag;
                cards.card.push(card);
            }
            var html = compiledCardsTemplate(cards);
            $$("#mainViewpage").html(html);
            
            //Adding the marker
            for (var i = 0; i < cards.card.length; i++) {
                if (cards.card[i].oFlag == "1") {
                    $$("#mark_pic_" + cards.card[i].employeeid).prop("src", "./pic/tick.png");
                }
                else if (cards.card[i].oFlag == "2") {
                    $$("#mark_pic_" + cards.card[i].employeeid).prop("src", "./pic/wrong.png");
                }
            }
            //console.log("code:" + $$('[name="employee_pic"]').length);
            //Add button events
            $$('[name="employee_pic"]').on('click', function () {
                console.log("TEST in employeepic");
                showInfo($$(this));
            });

            $$('[name="hrefHandleCorrect"]').on('click', function () { 
                console.log("In handlecorrect now.");
                var myparent = $$(this).parent();
                console.log("parent html: " + $$(myparent).html());
                var hidcontrol = $$(myparent).find("[name='hid_employeeid']");
                console.log("hidcontrol : " + hidcontrol.length);
                var employeeID = $$(hidcontrol).val();
                console.log("employeeID is " + employeeID);
                HandleCorrect($$(this), employeeID );
            });

            $$('[name="hrefHandleIncorrect"]').on('click', function () {
                console.log("In handle hrefHandleIncorrect now.");
                var myparent = $$(this).parent();
                console.log("parent html: " + $$(myparent).html());
                var hidcontrol = $$(myparent).find("input[name='hid_employeeid']");
                console.log("hidcontrol : " + hidcontrol.length);
                var employeeID = $$(hidcontrol).val();
                console.log("employeeID is " + employeeID);
                HandleIncorrect($$(this), employeeID);
            });


            console.log("All Cards are generated.");

        }, function (tx, error) {
            console.log('SELECT error: ' + error.message);
        });
    });
}

function initMainCards()
{
    //myApp.alert($$(document).find("input[name='my-radio']:checked").prop("value"), "Debug");
    RefreshCardsWithOption($$(document).find("input[name='my-radio']:checked").prop("value"));
    
}

function initappDB()
{

    db.transaction(function (tx) {
        tx.executeSql('DROP TABLE IF EXISTS appConfig');
        tx.executeSql('CREATE TABLE IF NOT EXISTS appConfig ([ID] INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL UNIQUE,[keyName] NVARCHAR(255) NOT NULL,[keyValue] NVARCHAR(500) NOT NULL)');
        tx.executeSql('INSERT INTO appConfig (keyName, keyValue) VALUES ("appVer", "1.0")');
        tx.executeSql('INSERT INTO appConfig (keyName, keyValue) VALUES ("appURL", "setup")');
        tx.executeSql('DROP TABLE IF EXISTS Cards');
        tx.executeSql('CREATE TABLE IF NOT EXISTS [Cards] ([ID] INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, [Name] NVARCHAR(300) NOT NULL,[HireDate] NVARCHAR(12), [AssignedPosition] NVARCHAR(300), [LeftPosition] NVARCHAR(300), [RightPosition] NVARCHAR(300), [HireType] NVARCHAR(100), [employeeid] NVARCHAR(10) NOT NULL,[PicDownloaded] TINYINT NOT NULL DEFAULT 0,[oFlag] TINYINT NOT NULL DEFAULT 0);');
        getDBVersion();
        getServerURL();
        getCardsCount();
    }, function(error) {
        console.log('Error when trying init appDB: ' + error.message);
    });
}

function ResetCards()
{
    db.transaction(function (tx) {       
        tx.executeSql('DROP TABLE IF EXISTS [Cards]');
        tx.executeSql('CREATE TABLE IF NOT EXISTS [Cards] ([ID] INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, [Name] NVARCHAR(300) NOT NULL,[HireDate] NVARCHAR(12), [AssignedPosition] NVARCHAR(300), [LeftPosition] NVARCHAR(300), [RightPosition] NVARCHAR(300), [HireType] NVARCHAR(100), [employeeid] NVARCHAR(10) NOT NULL,[PicDownloaded] TINYINT NOT NULL DEFAULT 0,[oFlag] TINYINT NOT NULL DEFAULT 0);');
        myApp.alert("The records in Cards are cleared.");
        getCardsCount();


    }, function (error) {
        console.log('Error when trying init ResetCards: ' + error.message);
    });
}

function getCardsCount()
{
    var strSql = "select count(*) as res from [Cards]";
    db.transaction(function (tx) {
        tx.executeSql(strSql, [], function (tx, rs) {
            var rCount = rs.rows.item(0).res;
            console.log('The returned Value from getCardsCount() is ' + rCount);
            $$("#spnCardCount").html(rCount);
            
        }, function (tx, error) {
            console.log('SELECT error: ' + error.message);
        });
    });
}


function checkDBExists()
{
    var strSql = 'SELECT count(*) as res FROM sqlite_master WHERE type="table" AND name = "appConfig"';
    db.transaction(function (tx) {
        tx.executeSql(strSql, [], function (tx, rs) {
            var rCount = rs.rows.item(0).res;
            console.log('The returned Value from checkDBExists is ' + rCount);
            if (parseInt(rCount) == 0)
            {
                console.log("Cannot find the database, the app will generate the database first.");
                initappDB();
            }
            else
            {
                console.log("The database already inited.");
                getDBVersion();
                getServerURL();
                getCardsCount();
            }
        }, function (tx, error) {
            console.log('SELECT error: ' + error.message);
        });
    });
   
}

function getServerURL()
{
    var strSql = 'SELECT keyValue FROM appConfig WHERE keyName = "appURL"';
    db.transaction(function (tx) {
        tx.executeSql(strSql, [], function (tx, rs) {
            var keyVal = rs.rows.item(0).keyValue;
            console.log("keyVal is " + keyVal);
            $$("#txtServerURL").val(keyVal);
            serverURL = $$("#txtServerURL").val();
        }, function (tx, error) {
            console.log('SELECT error: ' + error.message);
        });
    });
}

function getDBVersion()
{
    var strSql = 'SELECT keyValue FROM appConfig WHERE keyName = "appVer"';
    db.transaction(function (tx) {
        tx.executeSql(strSql, [], function (tx, rs) {
            var keyVal = rs.rows.item(0).keyValue;
            console.log("keyVal is " + keyVal);
            $$("#pDBVersion").html("Current Version:" + keyVal);
        }, function (tx, error) {
            console.log('SELECT error: ' + error.message);
        });
    });
}

function UpdateURL()
{
    var strSql = 'Update appConfig set keyValue="' + $$("#txtServerURL").val() + '" where keyName="appURL"';
    console.log("URL is " + $$("#txtServerURL").val());
    db.transaction(function (tx) {
        tx.executeSql(strSql, [], function (tx, rs) {
            console.log("Update OK.");
            myApp.alert("Server URL is updated to " + $$("#txtServerURL").val());
            serverURL = $$("#txtServerURL").val();
        }, function (tx, error) {
            console.log('Update error: ' + error.message);
        });
    });
}

function GetCardsFromWebServer()
{
    if (serverURL == "" || serverURL == "SETUP")
    {
        myApp.alert("Please setup the server url first.", "Warning");
        return;
    }

    pageIndex4Download = 1;
    RetrieveDataFromServer();
}

function RetrieveDataFromServer()
{
    var postdata = {};
    postdata.cmd = "GetCards";
    postdata.pageIndex = pageIndex4Download;
    if (pageIndex4Download == 1)
    {
        myApp.showPreloader('Downloading...');
    }
    else
    {
        myApp.hidePreloader();
        myApp.showPreloader('Downloading...' + pageIndex4Download + "/" + pageTotal4Download);
    }
    console.log("Start to post data to server. The URL is :" + serverURL + "/comInterface.ashx");
    $$.ajax({
        url: serverURL + "/comInterface.ashx",
        type: "POST",
        contentType: "application/json",
        data: JSON.stringify(postdata),
        // if successful response received (http 2xx)
        success: function (data, textStatus) {
            // We have received response and can hide activity indicator            
            data = JSON.parse(data);
            console.log("pageIndex is " + data.pageIndex);
            console.log("TotalPageNum is " + data.TotalPageNum);
            if (data.TotalPageNum == 0) {
                myApp.hidePreloader();
                myApp.alert("There is no any records from server.");
                return;
            }

            for (var i = 0; i < data.mCards.length; i++) {
                InsertData2Database(data.mCards[i].Name, 
                                    data.mCards[i].HireDate,
                                    data.mCards[i].AssignedPosition,
                                    data.mCards[i].LeftPosition,
                                    data.mCards[i].RightPosition,
                                    data.mCards[i].HireType,data.mCards[i].employeeid);

            }
            pageTotal4Download = data.TotalPageNum;
            if (pageIndex4Download < data.TotalPageNum)
            {
                console.log("Running in here!");
                pageIndex4Download += 1;
                
                setTimeout("RetrieveDataFromServer()",300);
                return;
            }
            else {
                getCardsCount();
                myApp.hidePreloader();
                myApp.alert("All Cards Records are saved in DB.");
                
            }
            
        },
        error: function (xhr, textStatus, errorThrown) {
            // We have received response and can hide activity indicator
            myApp.hidePreloader();
            myApp.alert('Error when trying to get data from server', 'Error');
        }
    });
}
/*
 public string Name;
        public string HireDate;
        public string AssignedPosition;
        public string LeftPosition;
        public string RightPosition;
        public string HireType;
        public string employeeid;
*/
function InsertData2Database(strName, strHireDate, strAssignedPosition, strLeftPosition, strRightPosition, strHireType, strEID)
{
    var strSql = 'Insert into [Cards] ([Name],[HireDate],[AssignedPosition],[LeftPosition],[RightPosition],[HireType],[employeeid]) values("' +
                                       strName + '","' + strHireDate+ '","' + strAssignedPosition+ '","' + strLeftPosition+ '","' + strRightPosition+ '","' + strHireType+ '","' + strEID + '")';
    console.log("Going to Insert data to Cards, SQL command is " + strSql);
    db.transaction(function (tx) {
        tx.executeSql(strSql, [], function (tx, rs) {
            console.log("Insert completed!");
        }, function (tx, error) {
            console.log('Insert error: ' + error.message);
        });
    });
}



// Now we need to run the code that will be executed only for About page.

// Option 1. Using page callback for page (for "about" page in this case) (recommended way):
myApp.onPageInit('index', function (page) {
    // Do something here for "about" page
    console.log("in pageInit");
})


function showInfo(obj)
{
    $$($$(obj).children('span')).attr('style', '');
    var parent = $$(obj).parent();
    $$($$(parent).find(".card-content")).attr('style', '');
    $$($$(parent).find(".card-footer")).attr('style','');
}

function DeletePics()
{
    window.resolveLocalFileSystemURL(cordova.file.dataDirectory, checkFileEntry, addError);
   

}

function DownloadPics()
{
    DeletePics();
    var strSql = "Update [Cards] set PicDownloaded = 0;";
    db.transaction(function (tx) {
        
        tx.executeSql(strSql);
        strSql = "select count(*) as cou from [Cards] where PicDownloaded = 0";
        tx.executeSql(strSql, [], function (tx, rs) {

            totalPicWaitingDownload = rs.rows.item(0).cou;
            
            currentDownloadPicsIndex = 0;
            //Give the app some time to delete all pics
            setTimeout("DownloadPicOneByOne()", 500);

        }, function (tx, error) {
            console.log('SELECT error: ' + error.message);
        });
    });    
}

function DownloadPicOneByOne()
{
    currentDownloadPicsIndex++;
    myApp.hidePreloader();
    myApp.showPreloader("Downloading pics: " + currentDownloadPicsIndex + "/" + totalPicWaitingDownload);
    var strSql = "select employeeid from [Cards] where PicDownloaded = 0 limit 1";
    db.transaction(function (tx) {
        tx.executeSql(strSql, [], function (tx, rs) {

            var len = rs.rows.length;
            if (len > 0)
            {
                var employeeID = rs.rows.item(0).employeeid;
                console.log("employeeid is " + employeeID);
                DownloadFile(serverURL + "/GetImageByID.ashx?eID=" + employeeID, employeeID);
            }
            else {
                myApp.hidePreloader();
                myApp.alert("All pics are downloaded. Please click the refresh pics to refresh all cards.", "Message");
            }

        }, function (tx, error) {
            console.log('SELECT error: ' + error.message);
        });
    });
}

function GetFilesCount()
{
    totalPicsCount = 0;
    window.resolveLocalFileSystemURL(cordova.file.dataDirectory, addFileEntry, addError);
   
}

var checkFileEntry = function (entry) {
    var dirReader = entry.createReader();
    dirReader.readEntries(
      function (entries) {
          var fileStr = "";
          var i;
          for (i = 0; i < entries.length; i++) {
              if (!entries[i].isDirectory) {                
                  //console.log(entries[i].fullPath);
                  if (entries[i].fullPath.indexOf(".jpg")> 0)
                  {
                      entries[i].remove();                      
                  }
              }
          }
          GetFilesCount();
      },
      function (error) {
          console.error("readEntries error: " + error.code);
      }
    );
};



/**
 * Recursive function for file entry.
 */
var addFileEntry = function (entry) {
    var dirReader = entry.createReader();
    dirReader.readEntries(
      function (entries) {
          var fileStr = "";
          var i;
          for (i = 0; i < entries.length; i++) {
              if (entries[i].isDirectory === true) {
                  // Recursive -- call back into this subdirectory
                  //addFileEntry(entries[i]);
              } else {
                  //console.log(entries[i].fullPath);
                  totalPicsCount++;
              }
          }
          $$("#spnPicCount").html(totalPicsCount);
      },
      function (error) {
          console.error("readEntries error: " + error.code);
      }
    );
};

/**
 * Directory error.
 */
var addError = function (error) {
    console.error("getDirectory error: " + error.code);
};

function DownloadFile(target_url, employeeid)
{
    console.log("Start downloadFile: " + target_url);
    var fileTransfer = new FileTransfer();
    var uri = encodeURI(target_url);
    var fileURL = cordova.file.dataDirectory + employeeid + ".jpg";
    console.log("The file URL is :" + fileURL);
    fileTransfer.download(
        uri,
        fileURL,
        function (entry) {
            console.log("download complete: " + entry.toURL());
            UpdatePicDownloadStatus(employeeid);
        },
        function (error) {
            console.log("download error source " + error.source);
            console.log("download error target " + error.target);
            console.log("download error code" + error.code);
        },
        false,
        {
            headers: {
                "Authorization": "Basic dGVzdHVzZXJuYW1lOnRlc3RwYXNzd29yZA=="
            }
        }
    );
}

function UpdatePicDownloadStatus(employeeID)
{
    var strSql = 'Update [Cards] set PicDownloaded = 1 where employeeid="' + employeeID + '"';
    db.transaction(function (tx) {
        tx.executeSql(strSql, [], function (tx, rs) {
            console.log("Updated PicDownloaded = 1");
            //Start to download another one!
            //myApp.hidePreloader();
            setTimeout("DownloadPicOneByOne()", 100);
        }, function (tx, error) {
            console.log('Update error: ' + error.message);
        });
    });
}

function getFileSuccess(parent)
{
    console.log("getFileSucess:" + parent.name);
}

function getFileFail(err)
{
    console.log("getFileFail:" + err.code);
}

function onErrorLoadFs(err)
{
    console.log("onErrorLoadFs" + err.code);
}



