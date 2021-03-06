import os
import sqlite3
import cherrypy
import json
from mako.template import Template
from mako.lookup import TemplateLookup
from git import *

import settings

lookup = TemplateLookup(directories=['static'])
format = "--pretty=format:%h [%cr] [%an] %d %s"

class GitWatcher(object):

    @cherrypy.expose
    def index(self):
        reviewed = []
        with sqlite3.connect(settings.DB) as conn:
            reviewed = [ str(i[0]) for i in conn.execute('SELECT * FROM reviewed').fetchall() ]
            
        tmpl = lookup.get_template('index.html')
        return tmpl.render(users=settings.USERS, update_time=settings.UPDATE_TIME, repo_host=settings.REPO_HOST, repo_path=settings.REPO_PATH, reviewed=reviewed)

class GitWatcherInterface(object):
    exposed = True

    def GET(self, hash=0):
        git = Git(settings.REPO_PATH)
        try:
            git.pull()
        except:
            pass

        if hash != 0:
            log_lines = git.log("--all", format, "--abbrev-commit", "%s..HEAD" % hash).split('\n')
        else:
            log_lines = git.log("--all", format, "--abbrev-commit").split('\n')
           
        raw_data = [ l.split(' ', 1) for l in log_lines]
        return json.dumps(raw_data)

    def PUT(self, hash):
        with sqlite3.connect(settings.DB) as conn:
            try:
                conn.execute('INSERT INTO reviewed VALUES ("%s")' % hash)
                conn.commit()
                print 'Checking [%s] as reviewed' % hash
            except sqlite3.IntegrityError:
                print 'Unchecking [%s] as reviewed' % hash
                conn.execute('DELETE FROM reviewed WHERE hash="%s"' % hash)
                conn.commit()
    

if __name__ == '__main__':

    conf = {
        '/':  {
            'tools.sessions.on': True,
            'tools.staticdir.root': os.path.abspath(os.getcwd())
        },
        '/git': {
            'request.dispatch': cherrypy.dispatch.MethodDispatcher(),
            },
        '/static': {
            'tools.staticdir.on': True,
            'tools.staticdir.dir': './static'
        }
    }

    webapp = GitWatcher()
    webapp.git = GitWatcherInterface()
    if settings.LOG == False:
        cherrypy.log.screen = False
        cherrypy.log.error_file = ""
        cherrypy.log.access_file = ""
    cherrypy.server.socket_host = settings.HOST
    cherrypy.server.socket_port = settings.PORT
    cherrypy.quickstart(webapp, '/', conf)
    
