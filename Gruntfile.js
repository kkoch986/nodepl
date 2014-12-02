module.exports = function(grunt) {

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    coffee: {
      compile: {
        files: {
          
        }
      },

      glob_to_multiple: {
        expand: true,
        flatten: true,
        cwd: 'src/',
        src: ['*.coffee'],
        dest: 'dist/',
        ext: '.js'
      }
    },
    watch: {
      files: ['src/*.coffee'],
      tasks: ['coffee']
    }
  });

  grunt.loadNpmTasks('grunt-contrib-coffee')
  grunt.loadNpmTasks('grunt-contrib-watch');

  grunt.registerTask('default', ['coffee']);

};