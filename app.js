$(function($){
  let url_spread_sheet;
  let p0 = new Promise(function(resolve, reject){
    $.get("../template.html", function(data){
      $("body").html(data);
      resolve(1);
    }).fail(function(err){console.log("failed loading")});
  });
  p0.then(function(_){
    let p1 = new Promise(function(resolve, reject){
      google.load("visualization", "1", {'packages': ['table', 'corechart'], "callback" : function(){resolve(1);} });
    });
    let p2 = new Promise(function(resolve, reject){
      $.getJSON("contest_data.json", function(data){
        url_spread_sheet = data["data"]["spread_sheet_url"];
        $("#contest_name").text(data["data"]["name"]);
        $("#start_end_time").text(`${data["data"]["from"]} - ${data["data"]["to"]}`);
        $("#spread_sheet_url").attr("href", url_spread_sheet).text(url_spread_sheet);
        $("#description").html(data["data"]["description"]);
        resolve(1);
      });
    });
    Promise.all([p1,p2]).then(function(val){
      main(url_spread_sheet);
    });
    $('#user_me').change(function(){
      location.hash = `${$('#user_me').val()}&${$('#user_rival').val()}`;
      resetTable();
      setState();
    });
    $('#user_rival').change(function(){
      location.hash = `${$('#user_me').val()}&${$('#user_rival').val()}`;
      resetTable();
      setState();
    });
    $('#nav_standings').click(function(){
      $("html,body").animate({scrollTop:$('#score').offset().top - 100});
    });
    $('#nav_submissions').click(function(){
      $("html,body").animate({scrollTop:$('#all_submissions').offset().top - 100});
    });
    $('#nav_problems').click(function(){
      $("html,body").animate({scrollTop:$('#problems').offset().top - 70});
    });
  });
});

function main(url_spread_sheet){
  let p1 = new Promise(function(resolve, reject){
    let query_submission = new google.visualization.Query( `${url_spread_sheet}gviz/tq?range=submissions!A:D`);
    query_submission.setQuery("select *");
    query_submission.send( function(r){submission_data = r.getDataTable();resolve(1);} );
  });

  let p2 = new Promise(function(resolve, reject){
    // let query_problem = new google.visualization.Query(`${url_spread_sheet}gviz/tq?range=problem_data!A:D`);
    // query_problem.setQuery("select *");
    // query_problem.send( function(r){problem_data = r.getDataTable(); resolve(1);} );
    $.getJSON("problem_data.json", function(data){
      problem_data = new google.visualization.DataTable(JSON.stringify(data));
      resolve(1);
    });
  });

  let p3 = new Promise(function(resolve, reject){
    // let query_round = new google.visualization.Query(`${url_spread_sheet}/tq?range=round_data!A:F`);
    // query_round.setQuery("select A,B,D,E,F order by B");
    // query_round.send( function(r){round_data = r.getDataTable(); resolve(1);} );
    $.getJSON("round_data.json", function(data){
      round_data = new google.visualization.DataTable(JSON.stringify(data));
      resolve(1);
    });
  });

  Promise.all([p1,p2,p3]).then(function(dammy){
    // console.log("problem data\n" + problem_data.toJSON());
    // console.log("round data\n" + round_data.toJSON());

    setUserList();
    initializeTable();
    $("#loading_text").text("");

    let url_hash = location.hash;
    if(url_hash.length >= 2){
      $("html,body").animate({scrollTop:$('#problems').offset().top - 70});
    }

  });
}

function resetTable(){
  $("#round_table").empty();
  $("#round_table").append( table_default );
  $("#count_solved").empty();
}

function setUserList(){
  for(let i=0; i<submission_data.getNumberOfRows(); i++){
    let roundid = submission_data.getValue(i, 1);
    submission_data.setCell( i,1,roundid, `${round_data.getValue(round_data.getFilteredRows([{column:0, value:roundid}])[0],1)}`, {style:`text-align:center;`});

    let level = submission_data.getValue(i, 2);
    submission_data.setCell( i,2,level, `${level==1?'Easy':level==2?'Medium':'Hard'}`, {className: `level_${level}`});
  }

  let users = submission_data.getDistinctValues(0);
  users.sort(function(a,b){
    if(a.toLowerCase() < b.toLowerCase()) return -1;
    else return 1;
  });
  
  let user_list_me = $('#user_me');
  for(let i=0; i<users.length; i++){
    user_list_me.append(`<option value='${users[i]}'>${users[i]}</option>`);
  }
  let user_list_rival = $('#user_rival');
  for(let i=0; i<users.length; i++){
    user_list_rival.append(`<option value='${users[i]}'>${users[i]}</option>`);
  }

  let score_data = new google.visualization.DataTable();
  score_data.addColumn("number", "Rank");
  score_data.addColumn("string", "Handle");
  score_data.addColumn("number", "Easy");
  score_data.addColumn("number", "Medium");
  score_data.addColumn("number", "Hard");
  score_data.addColumn("number", "Score");
  for(let i=0; i<users.length; i++){
    let arr = submission_data.getFilteredRows([{column:0, value:users[i]}]);
    let cnt = [0,0,0];
    for(let j=0; j<arr.length; j++){
      cnt[submission_data.getValue(arr[j], 2) - 1]++;
    }
    score_data.addRow([0, users[i], cnt[0],cnt[1],cnt[2], cnt[0]*250+cnt[1]*500+cnt[2]*1000]);
  }
  for(let i=0; i<score_data.getNumberOfRows(); i++){
    let rank = score_data.getFilteredRows([{column:5, minValue: score_data.getValue(i,5)+1 }]).length + 1;
    score_data.setCell(i,0, rank);
  }
  score_data.sort([{column:0}]);
  let score_table = new google.visualization.Table(document.getElementById("score"));
  score_table.draw( score_data, {page:true, pageSize:20, width:"100%", alternatingRowStyle:true, allowHtml:true} );

  let submission_table = new google.visualization.Table(document.getElementById('all_submissions'));
  submission_table.draw( submission_data , {page:true, pageSize:20, width:"100%", alternatingRowStyle:true, allowHtml:true});

}

function initializeTable(){
  let round_table = []; //{RoundID,RoundName,LevelOne, LevelTwo, LevelThree}
  for(let i=0; i<round_data.getNumberOfRows(); i++){
    let tmp = {};
    for(let j=0; j<round_data.getNumberOfColumns(); j++){
      tmp[ round_data.getColumnLabel(j) ] = round_data.getValue(i,j);
    }
    tmp["Easy"] = problem_data.getValue( problem_data.getFilteredRows([{column : 0, value : tmp["LevelOne"]}])[0], 1);
    tmp["Medium"] = problem_data.getValue( problem_data.getFilteredRows([{column : 0, value : tmp["LevelTwo"]}])[0], 1);
    tmp["Hard"] = problem_data.getValue( problem_data.getFilteredRows([{column : 0, value : tmp["LevelThree"]}])[0], 1);
    round_table.push( tmp );
  }

  table_default = "";
  for(let i=0; i<round_table.length; i++){
    let r_id = round_table[i]["RoundID"];
    table_default += `
      <tr id="round_${r_id}">
        <td>${round_table[i]["RoundName"]}</td>
        <td id="round_${r_id}_1"><a href="https://community.topcoder.com/tc?module=ProblemDetail&rd=${r_id}&pm=${round_table[i]["LevelOne"]}"   class="problem_link" target="_blank">${round_table[i]["Easy"]}</a></td>
        <td id="round_${r_id}_2"><a href="https://community.topcoder.com/tc?module=ProblemDetail&rd=${r_id}&pm=${round_table[i]["LevelTwo"]}"   class="problem_link" target="_blank">${round_table[i]["Medium"]}</a></td>
        <td id="round_${r_id}_3"><a href="https://community.topcoder.com/tc?module=ProblemDetail&rd=${r_id}&pm=${round_table[i]["LevelThree"]}" class="problem_link" target="_blank">${round_table[i]["Hard"]}</a></td>
      </td>`;
  }

  resetTable();
  setState();
}

function setState(){
  let url_hash = location.hash;
  if(url_hash.length >= 2){
    let users_ = url_hash.substring(1).split('&');
    $('#user_me').val(users_[0]);
    if(users_.length > 1){
      $('#user_rival').val(users_[1]);
    }
  }

  let user = $("#user_me").val();
  let solved = submission_data.getFilteredRows([{column:0, value:user}]);
  let cnt = [0,0,0];
  for(let i=0; i<solved.length; i++){
    let r_id  = submission_data.getValue( solved[i], 1 );
    let level = submission_data.getValue( solved[i], 2 );
    $(`#round_${r_id}_${level}`).addClass("solved_by_me");
    cnt[Number(level-1)]++;
  }
  if(solved.length > 0) $("#count_solved").append(`<tr>
      <td><a href="https://www.topcoder.com/members/${$("#user_me").val()}" target="_blank">${$("#user_me").val()}</a></td>
      <td>${cnt[0]}</td>
      <td>${cnt[1]}</td>
      <td>${cnt[2]}</td>
      <td>${cnt[0]*250 + cnt[1]*500 + cnt[2]*1000}</td>
    </tr>`);

  if(user !== "-") {
    $("#chart_you").show();
    $("#chart_text_you").text(user);
    for(let i=0; i<3; i++){
      let table_for_chart = new google.visualization.DataTable();
      table_for_chart.addColumn("string", "state");
      table_for_chart.addColumn("number", "count");
      table_for_chart.addRow(["Solved",  cnt[i]]);
      table_for_chart.addRow(["Unolved", round_data.getNumberOfRows() - cnt[i]]);

      let chart = new google.visualization.PieChart( $(`#chart_${["easy","med","hard"][i]}_you`)[0] );
      chart.draw(table_for_chart, {
        title  : `${["Easy","Medium","Hard"][i]}`,
        legend : 'none',
        width  : "100%",
        height : 250,
        pieSliceText: 'value',
        slices : {
          0:{color:`${["#0075c2","#e9bc00","#e95388"][i]}`},
          1:{color:`${["#a2c2e6","#fff3b8","#e6c0c0"][i]}`}
        }
      });
    }
    let table_for_chart = new google.visualization.DataTable();
    table_for_chart.addColumn("string", "state");
    table_for_chart.addColumn("number", "count");
    table_for_chart.addRow(["Score Easy",  cnt[0]*250]);
    table_for_chart.addRow(["Score Medium",  cnt[1]*500]);
    table_for_chart.addRow(["Score Hard",  cnt[2]*1000]);
    table_for_chart.addRow(["Unolved", round_data.getNumberOfRows()*(250+500+1000) - (cnt[0]*250 + cnt[1]*500 + cnt[2]*1000)]);

    let chart_easy = new google.visualization.PieChart( $(`#chart_score_you`)[0] );
    chart_easy.draw(table_for_chart, {
      title  : `Score`,
      legend : 'none',
      width  : "100%",
      height : 250,
      pieSliceText: 'value',
      slices : {
        0:{color:`#0075c2`},
        1:{color:`#e9bc00`},
        2:{color:`#e95388`},
        3:{color:`#dadada`}
      }
    });
  }else{
    $("#chart_you").hide();
  }

  user = $("#user_rival").val();
  solved = submission_data.getFilteredRows([{column:0, value:user}]);
  cnt = [0,0,0];
  for(let i=0; i<solved.length; i++){
    let r_id  = submission_data.getValue( solved[i], 1 );
    let level = submission_data.getValue( solved[i], 2 );
    $(`#round_${r_id}_${level}`).addClass("solved_by_rival");
    cnt[Number(level-1)]++;
  }
  if(solved.length > 0) $("#count_solved").append(`<tr>
      <td><a href="https://www.topcoder.com/members/${$("#user_rival").val()}" target="_blank">${$("#user_rival").val()}</a></td>
      <td>${cnt[0]}</td>
      <td>${cnt[1]}</td>
      <td>${cnt[2]}</td>
      <td>${cnt[0]*250 + cnt[1]*500 + cnt[2]*1000}</td>
    </tr>`);

}