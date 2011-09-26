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
	// jEasyQuiz default settings
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
	
	var methods = {
		init: function(options) 
		{
			$.extend(settings, options);
			
			return this.each(function()
			{
				var $this = $(this);
				var data = $this.data('jeasyquiz');
         
				console.log(settings);
		 
				// If the plugin hasn't been initialized yet
				if (!data) 
				{
					$this.data('jeasyquiz', {
						container : $this,
						jeasyquiz : 'test'
					});
				}
			});
		},
		
		test: function()
		{
			console.log(settings);
			console.log(data);
		}
	};

	$.fn.jEasyQuiz = function(params)
	{
		if (methods[params]) 
		{
			return methods[params].apply(this, Array.prototype.slice.call(arguments, 1));
		} 
		else if (typeof params === 'object' || !params) 
		{
			return methods.init.apply(this, arguments);
		} 
		else 
		{
			return $.error('Method ' + params + ' does not exist on jQuery.jEasyQuiz');
		}
	};

})(jQuery);