var iq = angular.module('iq', []);

iq.factory('gistFactory', [
  '$http',
  '$q',
  function (
    $http,
    $q
  ) {
    var gists = [],
        languages = {};

    return {
      addGist: function (gist) {
        if (!gist.id) {
          return;
        }

        // check if the question already exists
        var index = this.indexOfGist(gist.id);

        // add gist
        if (index === -1) {
          gists.push(gist);

        // replace gist
        } else {
          gists[index] = gist;
        }
      },

      fetchGists: function (ids) {
        var that = this;

        function callback (results) {
          angular.forEach(results, function (value, key) {
            var gist = that.parseGist(value.data);

            if (gist) {
              that.addGist(gist);
            }
          });
        }

        var promises = [];

        for (var i = 0, length = ids.length; i < length; i++) {
          var id = ids[i];

          promises.push($http({
            method: 'JSONP',
            url: 'https://api.github.com/gists/' + id + '?callback=JSON_CALLBACK'
          }));
        }

        return $q.all(promises).then(callback);
      },

      getGists: function () {
        return gists;
      },

      getLanguages: function () {
        return languages;
      },

      indexOfGist: function (id) {
        for (var i = 0, length = gists.length; i < length; i++) {
          var gist = gists[i];

          if (id === gist.id) {
            return i;
          }
        }

        return -1;
      },

      parseGist: function (data) {
        var gist = data.data;

        var id = gist.id;

        if (!id) {
          return null;
        }

        var language = this.parseLanguageFromGist(gist),
            name = gist.description ? gist.description : gist.id,
            url = gist.html_url;

        return {
          id: id,
          language: language,
          name: name,
          url: url,
          script: url + '.js',

          gist: data
        };
      },

      addLanguage: function (language) {
        if (this.getLanguage(language)) {
          return this.getLanguage(language);
        }

        function getRandomColor() {
          var color = "#";

          for (var i = 0; i < 6; i++) {
            color += Math.round(Math.random() * 9);
          }

          return color;
        }

        return languages[language.toLowerCase()] = {
          code: language.slice(0, 1),
          color: getRandomColor(),
          name: language
        };
      },

      getLanguage: function (language) {
        return languages[language.toLowerCase()];
      },

      parseLanguageFromGist: function (gist) {
        var gist_languages = [],
            files = Object.keys(gist.files);

        for (var i = 0, length = files.length; i < length; i++) {
          var language = gist.files[files[i]].language;

          gist_languages.push(language);
        }

        for (var i = 0, length = gist_languages.length; i < length; i++) {
          this.addLanguage(gist_languages[i]);
        }

        if (gist_languages.length > 1) {
          this.addLanguage('Mixed');
        }

        if (gist_languages.length > 1) {
          return this.getLanguage('Mixed');
        } else {
          return this.getLanguage(gist_languages[0]);
        }
      }
    };
  }
]);

iq.controller('InterviewController', [
  '$scope',
  'gistFactory',
  function (
    $scope,
    gistFactory
  ) {
    $scope.interview = {};
    $scope.interview.gist_ids = localStorage.getItem("gist_ids");

    $scope.selected = {};
    $scope.selected.gists = {};

    $scope.buildQuestionList = function () {
      var ids = $scope.interview.gist_ids.split(',');

      var gist_ids = ids.map(function (value) {
        return value.trim();
      });

      gistFactory.fetchGists(gist_ids).then(function () {
        $scope.gists = gistFactory.getGists();
        $scope.languages = gistFactory.getLanguages();
      });
    };

    $scope.selectGist = function (gist_id) {
      var is_gist_selected = $scope.selected.gists[gist_id];

      if (is_gist_selected) {
        $scope.selected.gists[gist_id] = false;
      } else {
        $scope.selected.gists[gist_id] = true;
      }
    };

    $scope.$watch("interview.gist_ids", function (newValue, oldValue) {
      if (newValue == oldValue) {
        return;
      }

      localStorage.setItem("gist_ids", newValue);
    });
  }
]);

iq.directive('iqShowGist', [
  '$http',
  '$document',
  function (
    $http,
    $document
  ) {
    var GIST_GITHUB_DOMAIN = 'https://gist.github.com/';

    function addStylesheet(path) {
      $stylesheet = $document.find('#gist_css');

      if ($stylesheet.length == 0) {
        $document.find('head').append('<link id="gist_css" rel="stylesheet" href="' + path + '" />');
      }
    }

    return {
      scope: {
        gist_id: '@iqShowGist'
      },
      link: function (scope, element, attrs) {
        var $element = $(element),
            $li = $element.closest('li');

        $element.on('click', function (event) {
          var $gist = $li.find('.gist');

          // fetch gist
          if ($gist.length === 0) {
            var url = GIST_GITHUB_DOMAIN + scope.gist_id + '.json?callback=JSON_CALLBACK';

            $http({
              method: 'JSONP',
              url: url
            })
              .success(function (data, status, headers, config) {
                // add gist stylesheet
                addStylesheet(data.stylesheet);

                // add gist
                $li.append(data.div);
              });

          // if gist is already on the page show/hide it instead
          } else {
            $gist.toggle();
          }

          event.preventDefault();
        });
      }
    }
  }
]);
