var template = _.template('<div class="commit"><% if (new_tag) {%> <span class="new">new</span> <% } %><span class="hash"><a href="<%= link %>" target="_blank"><%= hash %></a></span><span class="author"><%= author %></span><span class="time"><%= time %> </span><%= message %></div>');

var last_commit = 0;
var audioElement = undefined;

function play_pop() {
    audioElement = audioElement || document.createElement('audio');
    audioElement.setAttribute('src', 'static/pop.wav');
    audioElement.setAttribute('autoplay', 'autoplay');
    audioElement.play();
}

function parse_commit_message(message) {
    message = message.split(']', 3);
    return {
        time: message[0].replace('[', ''),
        author: message[1].replace('[', ''),
        message: message[2]
    };
}

function get_column_for(author) {
    var item = _.find(USERS, function(i) { return author.search(i) > -1; })
    return $('#' + item);
}

function update_all_commits(url, path) {
    $.ajax({
        url: 'git',
        type: 'GET',
        success: function(data) {
            var $gitlog = $('.git-log');
            data = JSON.parse(data);
            last_commit = data[0][0]
            _.each(data, function(commit) {
                commit[1] = parse_commit_message(commit[1]);

                var $column = get_column_for(commit[1].author);
                $column.append(template({
                    new_tag: false,
                    link: "http://" + url + "/gitweb/?p=" + path + ".git;a=commitdiff;h=" + commit[0],
                    hash: commit[0],
                    message: commit[1].message,
                    author: commit[1].author,
                    time: commit[1].time
                }));
            });
        }
    });
}

function update_commits(url, path) {
    $.ajax({
        url: 'git',
        type: 'GET',
        success: function(data) {
            var $gitlog = $('.git-log');
            data = JSON.parse(data);
            
            for (var i = 0, commit = data[i]; i < data.length; i++, commit = data[i]) {
                if (commit[0] == last_commit) 
                    break;
                play_pop();
                commit[1] = parse_commit_message(commit[1]);
                var $column = get_column_for(commit[1].author);
                $column.prepend(template({
                    new_tag: true,
                    link: "http://" + url + "/gitweb/?p=" + path + ".git;a=commitdiff;h=" + commit[0],
                    hash: commit[0],
                    message: commit[1].message,
                    author: commit[1].author,
                    time: commit[1].time
                }));
            }
            last_commit = data[0][0];
        }
    });
}

function render_columns() {
    var $log = $('.git-log');
    var columns = USERS.length;
    var column_width = 100 / USERS.length;
    for (var column = 0; column < USERS.length; column++) {
        $log.append('<div class="git-log-column" id="' + USERS[column] + '"></div>');
    }
    $('.git-log-column').css('width', column_width + '%');
}

$(document).ready(function() {
    render_columns();
    update_all_commits(REPO_HOST, REPO_PATH);
    setInterval(function () { 
        update_commits(REPO_HOST, REPO_PATH);
    }, UPDATE_TIME);
});
