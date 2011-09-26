/**
 * jQuery plugin : jEasyQuiz
 * Dual licensed under the MIT or GPL Version 2 licenses.
 * http://jquery.org/license
 *
 * @package jEasyQuizz
 * @version alpha 1
 */

/**
 * @TODO refactor the whole code according to rules defined in http://docs.jquery.com/Plugins/Authoring
 * @TODO feedback par fonction
 * @TODO CSS
 */

(function($)
{
	/**
	 * jEasyQuiz default settings
	 */
	var settings = {
		// main options
		source: '', // URL of the file containing the exercises' data
		data: {}, // data to send to the source file
		requestMethod: 'get', // source file request method (MUST BE either 'get' or 'post')
		audio: false, // whether or not audio files are used in the quizz

		// classes of the various containers
		loading: 'quizz_loading', // the class of the element containing the loading informations
		title: 'quizz_title', // the class of the title container
		statement: 'quizz_statement', // the class of the statement container
		score: 'quizz_score', // the class of the score container
		feedback: 'quizz_feedback',
		exercise: 'quizz_exercise', // the class of the exercise container, i.e. the element where the user will click and drag'n'drop
		actionBar: 'quizz_action_bar', // the class of the action bar, containing the buttons
		dragContainer: 'quizz_drags', // the class of the element that will contain the draggable elements

		// buttons and inputs
		btnNext: 'quizz_btn_next', // the class of the 'Next' button
		btnGo: 'quizz_btn_go', // the class of the 'GO' button
		btnCheck: 'quizz_btn_check', // the class of the 'Check' button
		inputName: 'quizz_word_answer', // the name attribute to use on the radio inputs

		// CSS classes (style can be personnalized int jeasyquiz.css)
		pickedClass: 'quizz_picked', // the class to add to an answer when the user selects it
		correctClass: 'quizz_correct', // the class to add to the picked answer if it's correct
		wrongClass: 'quizz_wrong', // the class to add to the picked answer if it's wrong 
		missingLabelClass:'quizz_missing', // the class to add labels of the Missing exercises
		draggableClass: 'quizz_draggable', // the class to add to the draggable elements 
		droppableClass: 'quizz_droppable', // the class to add to the droppable elements
		feedbackOkClass: 'quizz_feedback_ok',
		feedbackWrongClass: 'quizz_feedback_wrong',

		// score infos
		initialScore: 0, // the initial score when begining the quizz
		scoreIncrease: 1, // the amount of points to add to the current score when a good answer is chosen on first attempt

		// directories & URLs
		imagesDir: 'images/', // the directory to load the images from
		audioDir: 'audio/', // the directory to load the audio files from

		// misc
		feedbackOk: 'Good answer !', // the default feedback message to show on a good answer
		feedbackWrong: 'Bad answer...', // the default feedback message to show on a bad answer
		eventNamespace: 'jeasyquiz', // a namespace to use for all the events related to the quizz
		blankElement: 'span', // the element containing the blank placeholder
		endHandler: function(score, time, percent) // default end of the quiz handler
		{ 
			alert('Final score: ' + score + "\n"
				+ 'Total time: ' + time.h + ':' + time.m + ':' + time.s + "\n"
				+ 'Percentage of correct answers: ' + percent + '%');
		}
	};
	
	var exercisesFactory = {
		Exercise: function($source)
		{
			var $_source = $source;
			console.log('$source');
			console.log($source);
			console.log('$_source');
			console.log($_source);

			this.title = $_source.find('title').text();

			this.questions = $_source.find('question');

			this.current_question = -1;

			this.initialized = false;

			this.last_question = this.questions.length-1;

			this.input_type = 'radio';

			this.type = parseInt($_source.attr('type'));
		},
		
		PicturePicking: function($source)
		{
			exercisesFactory.Exercise.call(this, $source);

			this.zones = $(source).find('zone');
		},
		
		MultipleAnswers: function($source)
		{
			exercisesFactory.Exercise.call(this, $source);
		},
		
		DragAndDrop: function($source)
		{
			exercisesFactory.Exercise.call(this, $source);
		}
	}
	
	exercisesFactory.PicturePicking.prototype = new exercisesFactory.Exercise();
	exercisesFactory.MultipleAnswers.prototype = new exercisesFactory.Exercise();
	exercisesFactory.DragAndDrop.prototype = new exercisesFactory.Exercise();
	
	
	
	/**
	 * Internal data
	 */
	var _data = {
		exercises: [],
		score: 0,
		totalQuestions: 0,
		currentQuestion: 0
	};
	
	/**
	 * Methods the user can call
	 */
	var publicMethods = {
		//,
		
		
		
		test: function()
		{
			console.log(this);
		}
	};
	
	/**
	 * Private methods unavailable for end-users
	 */
	var privateMethods = {
		/**
		 * Initialize the quiz
		 * @param options An option object
		 */
		_init: function(options) 
		{
			$.extend(settings, options);
			
			return this.each(function()
			{
				var $this = $(this);
				var data = $this.data('jeasyquiz');
		 
				// If the plugin hasn't been initialized yet
				if (!data) 
				{
					if(!settings.source || settings.source === '')
					{
						$.error('Unable to initialize the quiz because no source of data supplied.');
					}
					else
					{
						$.ajax({
							url: settings.source,
							async: true,
							type: settings.requestMethod,
							data: (settings.data),
							dataType: 'xml',
							success: function(data)
							{
								privateMethods.processData($(data).find('exercise'));
								//settings.data = data;
							},
							error: function()
							{
								$.error('Unable to initialize the quiz because the data source could not be reached.');
							}
						});

						_data.score = settings.initialScore;
					}
					
					data = _data;
				}
			});
		},
		
		/**
		 * Build the exercises from raw xml data
		 * @param rawExercises The raw data
		 */
		processData: function(rawExercises)
		{
			var len = rawExercises.length;
			
			for(var i=0; i<len; i++)
			{
				//switch (rawExercises.eq(i).attr('type')) 
				switch (rawExercises[i].getAttribute('type'))
				{
					case 1 : 
					case '1' :
					case 'PicturePicking' : 
					case 'pp' :
						_data.exercises.push(new exercisesFactory.PicturePicking(rawExercises[i]));
						_data.total_questions += _data.exercises[i].getQuestions().length;
						break;
					case 2 : 
					case '2' :
					case 'MissingWord' : 
					case 'mw' :
						_data.exercises.push(new exercisesFactory.Exercise(rawExercises[i]));
						_data.total_questions += _data.exercises[i].getQuestions().length;
						break;
					case 3 : 
					case '3' :
					case 'AudioMatching' : 
					case 'am' :
						_data.exercises.push(new exercisesFactory.Exercise(rawExercises[i]));
						_data.total_questions += _data.exercises[i].getQuestions().length;
						break;
					case 4 : 
					case '4' : 
					case 'MultipleAnswers' : 
					case 'ma' :
						_data.exercises.push(new exercisesFactory.MultipleAnswers(rawExercises[i]));
						_data.total_questions += _data.exercises[i].getQuestions().length;
						break;
					case 5 : 
					case '5' : 
					case 'dd' :
					case 'DragAndDrop' : 
					case 'dnd' :
						_data.exercises.push(new exercisesFactory.DragAndDrop(rawExercises[i]));
						_data.total_questions += _data.exercises[i].getQuestions().length;
						break;
					default:
						break;
				}

				console.log(_data.exercises);
			}
		}
	};
	
	//<editor-fold defaultState="collapsed">
	$.fn.jEasyQuiz = function(params)
	{
		if (publicMethods[params]) 
		{
			return publicMethods[params].apply(this, Array.prototype.slice.call(arguments, 1));
		} 
		else if (typeof params === 'object' || !params) 
		{
			return privateMethods._init.apply(this, arguments);
		} 
		else 
		{
			return $.error('Method ' + params + ' does not exist on jQuery.jEasyQuiz');
		}
	};
	//</editor-fold>
})(jQuery);