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
		content: 'quizz_exercise', // the class of the exercise container, i.e. the element where the user will click and drag'n'drop
		actionBar: 'quizz_action_bar', // the class of the action bar, containing the buttons
		dragContainer: 'quizz_drags', // the class of the element that will contain the draggable elements

		// buttons and inputs
		btnNext: 'quizz_btn_next', // the class of the 'Next' button
		btnGo: 'quizz_btn_go', // the class of the 'GO' button
		btnCheck: 'quizz_btn_check', // the class of the 'Check' button
		inputName: 'quizz_word_answer', // the name attribute to use on the radio inputs

		// CSS classes (style can be personnalized int jeasyquiz.css)
		answerClass: 'quizz_answer', // the class to add to every answer choice
		answerClassPicked: 'quizz_picked', // the class to add to an answer when the user selects it
		answerClassCorrect: 'quizz_correct', // the class to add to the picked answer if it's correct
		answerClassWrong: 'quizz_wrong', // the class to add to the picked answer if it's wrong 
		missingLabelClass:'quizz_missing', // the class to add labels of the Missing exercises
		draggableClass: 'quizz_draggable', // the class to add to the draggable elements 
		droppableClass: 'quizz_droppable', // the class to add to the droppable elements
		feedbackClassOk: 'quizz_feedback_ok',
		feedbackClassWrong: 'quizz_feedback_wrong',

		// score infos
		initialScore: 0, // the initial score when begining the quizz
		scoreIncrease: 1, // the amount of points to add to the current score when a good answer is chosen on first attempt

		// directories & URLs
		imagesDir: 'images/', // the directory to load the images from
		audioDir: 'audio/', // the directory to load the audio files from

		// misc
		feedbackMessageOk: 'Good answer !', // the default feedback message to show on a good answer
		feedbackMessageWrong: 'Bad answer...', // the default feedback message to show on a bad answer
		eventNamespace: 'jeasyquiz', // a namespace to use for all the events related to the quizz
		blankElement: 'span', // the element containing the blank placeholder
		endHandler: function(score, time, percent) // default end of the quiz handler
		{ 
			alert('Final score: ' + score + "\n"
				+ 'Total time: ' + time.h + ':' + time.m + ':' + time.s + "\n"
				+ 'Percentage of correct answers: ' + percent + '%');
		}
	};	
	

	/**
	 * Basic exercise.
	 * The user has to pick one only answer among a set of several ones.
	 * 
	 * @param source The raw xml source
	 */
	function Exercise(source)
	{
		var $source = $(source);

		this.title = $source.find('title').text();

		this.questions = $source.find('question');

		this.currentQuestion = -1;

		this.initialized = false;

		this.lastQuestion = this.questions.length-1;

		this.input_type = 'radio';

		this.type = parseInt($source.attr('type'));
	}

	Exercise.prototype = 
	{
		/*
		 * GETTERS
		 */

		getTitle: function()
		{ 
			return this.title;
		},

		/**
		 * return the statement of the question at the specified index
		 * or the current question if no parameter supplied
		 * 
		 * @param index number the index of the question from which the statement has to be returned
		 * 
		 * @return string
		 */
		getStatement: function(index)
		{
			if(!index)
			{
				index = this.currentQuestion;
			}
			
			return (1+index) + '. ' + $(this.questions[index]).find('statement').text();
		},
		
		getContent: function()
		{
			// cache the document var
			var d = document;
			// get all the possible answers
			var answers = $(this.getAnswers()).find('choice');
			// create an ordered list to contain the answers
			var answersContainer = d.createElement('ol');
			var answer;
			var label;
			var input;
			var len = answers.length;

			// create a <li> element for each answer 
			// and add it to the container previously created
			for(var i = 0; i<len; i++)
			{
				input = d.createElement('input');
				label = d.createElement('label');
				answer = d.createElement('li');

				input.type = this.input_type;
				input.name = settings.inputName;
				$(input).data('type', answers[i].getAttribute('type'));

				label.className = settings.missingLabelClass + ' ' + settings.answerClass;

				label.appendChild(input);
				label.appendChild(d.createTextNode(answers[i].getAttribute('label')));
				answer.appendChild(label);
				//answer.className = settings.answerClass;
				answersContainer.appendChild(answer);
			}
						
			return answersContainer;
			
		},

		/**
		 * return the current question (statement + answer) at the specified index
		 * or the current question if no parameter supplied
		 * 
		 * @param index the index of the question that has to be returned
		 * 
		 * @return element
		 */
		getQuestion: function(index)
		{
			if(!index)
				index = this.currentQuestion;
			else
				index = parseInt(index);

			return this.questions[index];
		},

		getQuestionNum: function()
		{
			return this.currentQuestion;
		},

		/**
		 * return an array containing all the questions of the exercise
		 * 
		 * @return array
		 */
		getQuestions: function()
		{
			return this.questions;
		},

		/**
		 * return the answers for the current question
		 * 
		 * @return array
		 */
		getAnswers: function(type)
		{               
			var selector = 'answer';

			if(type && type.length > 1)
				selector += '[type="' + type + '"]';

			return $(this.questions[this.currentQuestion]).find(selector);
		},

		/**
		 * get the feedback relative to the chosen answer
		 * 
		 * @return string | boolean
		 */
		getFeedback: function()
		{
			var index = $('.' + settings.answerClassPicked).index();
			var elem;

			if(index > -1)
			{
				elem = $(this.getAnswers()).find('choice')[index];

				if(elem)
				{
					return elem.getAttribute('feedback');
				}
			}

			return false;
		},

		/**
		 * return the index of the next question or false if there's no next question 
		 * i.e. if this question was the last one
		 * 
		 * @return number | boolean
		 */
		nextQuestion: function()
		{                
			if(this.currentQuestion < this.lastQuestion)
			{
				this.initialized = false;
				return this.currentQuestion++;
			}

			return false;
		},

		/**
		 * return true if is the first time the user answsers this question, false if not
		 * 
		 * @return boolean
		 */
		firstAttempt: function()
		{
			return !(this.initialized);
		},

		/**
		 * default check function, can be overriden by subclass
		 * 
		 * @return boolean
		 */
		check: function() 
		{
			var result = null;
			
			if(!(this.initialized))
			{
				this.initialized = true;
			}
			
			result = _data.elements.container.find('.' + settings.content + ' input[name="' + settings.inputName + '"]:checked');
			
			return result.data('type') == 'true'; 
		},

		isFinished: function()
		{
			return (this.currentQuestion == this.lastQuestion);
		}
	}
	
	/**
	 * PicturePicking exercise.
	 * The user has to pick a picture that matches a text description 
	 * or a situation described in an audio extract.
	 * 
	 * @param source The raw xml source
	 */
	function PicturePicking(source)
	{
		Exercise.call(this, source);

		this.zones = $(source).find('zone');
		
		this.cache = null;
	}

	PicturePicking.prototype = new Exercise();

	PicturePicking.prototype.getZones = function()
	{
		return this.zones;
	};

	PicturePicking.prototype.getZone = function(index)
	{
		if(!index)
			index = this.currentQuestion;
		else
			index = parseInt(index);

		return this.zones[index];
	};

	PicturePicking.prototype.getContent = function ()
	{
		var d = document;
		var len = this.zones.length;
		var img = null;
		var container = null;
		
		if(!(this.currentQuestion))
		{
			container = document.createDocumentFragment();
			
			for(var i=0; i<len; i++)
			{
				img = new Image();
				img.src = settings.imagesDir + this.zones[i].getAttribute('picture');
				img.id = this.zones[i].getAttribute('id');
				img.alt = this.zones[i].textContent;
				img.className = settings.answerClass;
				//img.setAttribute('title', zones[i].textContent);

				container.appendChild(img);
			}
		}

		console.log(_data.elements.container.find('.' + settings.exercise + ' img.' + settings.answerClass).removeClass(settings.answerClassPicked + ' ' + settings.answerClassCorrect + ' ' + settings.answerClassWrong));
		
		return container;
	};

	PicturePicking.prototype.check = function($exercise_c)
	{
		if(!(this.initialized))
		{
			this.initialized = true;
		}

		return ($exercise_c.find('img.' + options.picked_class).attr('id') == ($(this.questions[this.currentQuestion]).find('choice').attr('id')))
	};

	
	/**
	 * DragAndDrop exercise.
	 * The user has to drag each element of a set A in front of a set B.
	 * 
	 * @param source The raw xml source
	 */
	function DragAndDrop(source)
	{
		Exercise.call(this, source);
	}

	DragAndDrop.prototype = new Exercise();

	DragAndDrop.prototype.display = function($container)
	{
		// get the data of the draggable elements
		var drags = this.getAnswers('drag').find('choice');
		//get the data of the elements where the draggable elements will be dropped
		var drops = this.getAnswers('drop').find('choice');
		var i = 0;
		var len = drags.length;

		//create the two global containers
		var drag_gc = document.createElement('ul');
		drag_gc.id = options.drag_container;
		var drop_gc = document.createElement('ol');

		var drag;
		var drop;

		//clean the container
		$container.html('');

		// create and add every draggable elements to the drag global container
		for(i; i<len; i++)
		{
			// create a draggable element from the data fetched before
			drag = document.createElement('li');
			drag.className = options.draggable_class;
			drag.innerHTML = drags[i].getAttribute('label');
			drag.id = drags[i].getAttribute('id');

			// make it draggable
			$(drag).data('quizz_position', 0).draggable(
			{
				// draggable elements can't go out of the global container with id options.exercise
				containment: $container,
				snap: '.ui-droppable',
				snapMode: 'inner',
				// revert the position if not dropped on a droppable element
				revert: 'invalid'
			});

			//$(drag).draggable.helper.data('quizz_position', 'nok');

			// add it to its container
			drag_gc.appendChild(drag);
		}

		len = drops.length;
		// create and add every elements where the draggables can be dropped (= droppable)
		for(i=0; i<len; i++)
		{
			// create a droppable element from the data fetched before
			drop = document.createElement('li');
			drop.className = options.droppable_class;
			drop.innerHTML = drops[i].getAttribute('label');

			// make it droppable
			$(drop).data('accept', drops[i].getAttribute('id')).droppable(
			{
				tolerance: 'touch',
				hoverClass: options.picked_class,
				drop: function(e, draggable)
				{
					(draggable.helper.attr('id') == $(this).data('accept'))
					? draggable.helper.data('quizz_position', 1)
					: draggable.helper.data('quizz_position', 0);
				}
			});

			// add it to its container
			drop_gc.appendChild(drop);
		}

		// make the global container droppable
		$(drag_gc).droppable(
		{
			// update the data-position attribute
			drop: function(e, draggable)
			{
				draggable.helper.data('quizz_position', 0);
			}
		});

		// add all the elements to the DOM
		$container.append(drag_gc);
		$container.append(drop_gc);
	};

	DragAndDrop.prototype.check = function($container)
	{
		var li = $container.children('#' + options.drag_container).find('li.ui-draggable');
		var i = 0;
		var len = li.length;
		var correct = true;
		var $current_li = null;

		if(!(this.initialized))
			this.initialized = true;

		for(i; i<len; i++)
		{
			$current_li = $(li[i]);
			if($current_li.data('quizz_position') == 0)
			{
				correct = false;
				$current_li.css({
					left: 0, 
					top:0
				});
			}
			else
			{
				$current_li.addClass(options.correct_class).draggable("disable"/*{cancel: 'li'}*/);
			}
		}

		return correct;

	};

	
	/**
	 * MultipleAnswers exercise.
	 * The user has to pick the correct answers relative to the statement.
	 * 
	 * @param source The raw xml source
	 */
	function MultipleAnswers(source)
	{
		Exercise.call(this, source);

		this.input_type = 'checkbox';
	}

	MultipleAnswers.prototype = new Exercise();

	MultipleAnswers.prototype.check = function($container)
	{
		var answers = $container.find('input[type="checkbox"]');
		var $answer = null;
		var len = answers.length;
		var check = true;

		if(!(this.initialized))
			this.initialized = true;

		for(var i=0; i<len; i++)
		{
			$answer = $(answers[i]);

			switch(true)
			{
				case ($answer.data("type") == "false" && $answer.prop("checked")) :
					$answer.removeProp("checked");
				case ($answer.data("type") == "true" && !$answer.prop("checked")) :
					check = false;
					break;
			}
		}

		return check;
	};
	
	
	
	
	/**
	 * Internal data
	 */
	var _data = {
		exercises: [],
		score: 0,
		maxScore: 0,
		totalQuestions: 0,
		currentExercise: 0,
		currentQuestion: 0,
		/**
		 * Holds several elements we manipulate a lot
		 */
		elements: {
			container: null,
			title: null,
			statement: null,
			content: null,
			actionBar: null,
			score: null,
			btnCheck: null,
			btnNext: null,
			feedback: null
		}
	};
	
	
	
	/**
	 * Private methods unavailable for end-users
	 */
	var privateMethods = {
		getCurrentExercise: function()
		{
			return _data.exercises[_data.currentExercise];
		}, 
		
		/**
		 * Initialize the quiz
		 * @param options An option object
		 */
		init: function(options) 
		{
			$.extend(settings, options);
			
			return this.each(function()
			{
				var data = $(this).data('jeasyquiz');

				// if the plugin hasn't been initialized yet
				if (!data) 
				{
					if(!settings.source || settings.source === '')
					{
						$.error('Unable to initialize the quiz because no source of data was supplied.');
					}
					else
					{
						// data settings
						_data.elements.container = $(this);
						
						// show the loading feedback and hide the "go" button
						_data.elements.container.find('.' + settings.loading).show()
						.end().find('.' + settings.btnGo).hide();
						
						// hide the action bar and store it in the _data object
						_data.elements.actionBar = _data.elements.container.find('.' + settings.actionBar).hide();
						
						if(_data.elements.container.find('.' + settings.title).length == 0)
						{
							_data.elements.actionBar.before($('<h2 />', {"class": settings.title}));
						}
						
						if(_data.elements.container.find('.' + settings.statement).length == 0)
						{
							_data.elements.actionBar.before($('<h3 />', {"class": settings.statement}));
						}
						
						if(_data.elements.container.find('.' + settings.content).length == 0)
						{
							_data.elements.actionBar.before($('<div />', {"class": settings.content}));
						}
						
						$.ajax({
							url: settings.source,
							async: true,
							type: settings.requestMethod,
							data: (settings.data),
							dataType: 'xml',
							success: function(data)
							{
								privateMethods.processData($(data).find('exercise'));
								
								_data.maxScore = _data.totalQuestions*settings.scoreIncrease + settings.initialScore;
								
								_data.elements.container.find('.' + settings.loading)
								.hide(500).end()
								.find('.' + settings.btnGo).show(500);
							//settings.data = data;
							},
							error: function()
							{
								$.error('Unable to initialize the quiz because the data source could not be reached.');
							}
						});
						
						// populate the data
						_data.score = settings.initialScore;
						
						_data.elements.title = _data.elements.container.find('.' + settings.title);
						_data.elements.statement = _data.elements.container.find('.' + settings.statement);
						_data.elements.content = _data.elements.container.find('.' + settings.content);
						_data.elements.feedback = _data.elements.container.find('.' + settings.feedback);
						_data.elements.score = _data.elements.container.find('.' + settings.score);
						_data.elements.btnNext = _data.elements.actionBar.find('.' + settings.btnNext);
						_data.elements.btnCheck = _data.elements.actionBar.find('.' + settings.btnCheck);




						/**
						 * Buttons Events binding
						 */
						// "go" button
						_data.elements.container.find('.' + settings.btnGo)
						.bind('click.' + settings.eventNamespace , function()
						{
							// hide the loader and the button
							_data.elements.container.find('.' + settings.loading).hide();
							$(this).hide();
							
							publicMethods.nextQuestion();
							
							// show the other elements
							_data.elements.title.show();
							_data.elements.statement.show();
							_data.elements.content.show();
							_data.elements.actionBar.show();
						});
						
						// "check" button
						_data.elements.btnCheck.live('click.' + settings.eventNamespace, function()
						{
							publicMethods.checkAnswer();
						});
						
						// "next" button
						_data.elements.btnNext.live('click.' + settings.eventNamespace, function()
						{
							publicMethods.nextQuestion();
						});
						
						
						/**
						 * Answer elements events binding
						 */
						
						_data.elements.content.find(' .' + settings.answerClass)
						.live('click.' + settings.eventNamespace, function()
						{
							_data.elements.container.find('.' + settings.content + ' .' + settings.answerClass)
							.removeClass(settings.answerClassPicked);
							
							$(this).addClass(settings.answerClassPicked);
						});
						
						// set the initial score
						publicMethods.updateScore(settings.initialScore);
					}
					
					// set the data to prevent the plugin from beeing accidently re-initialized
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
						_data.exercises.push(new PicturePicking(rawExercises[i]));
						_data.totalQuestions += _data.exercises[i].getQuestions().length;
						break;
					case 2 : 
					case '2' :
					case 'MissingWord' : 
					case 'mw' :
					case 3 : 
					case '3' :
					case 'AudioMatching' : 
					case 'am' :
						_data.exercises.push(new Exercise(rawExercises[i]));
						_data.totalQuestions += _data.exercises[i].getQuestions().length;
						break;
					case 4 : 
					case '4' : 
					case 'MultipleAnswers' : 
					case 'ma' :
						_data.exercises.push(new MultipleAnswers(rawExercises[i]));
						_data.totalQuestions += _data.exercises[i].getQuestions().length;
						break;
					case 5 : 
					case '5' : 
					case 'dd' :
					case 'DragAndDrop' : 
					case 'dnd' :
						_data.exercises.push(new DragAndDrop(rawExercises[i]));
						_data.totalQuestions += _data.exercises[i].getQuestions().length;
						break;
					default:
						break;
				}

			}
		}
	};
	
	
	/**
	 * Methods the user can call
	 */
	var publicMethods = {
		/*nextExercise: function()
		{
			_data.currentExercise++;
			_data.currentQuestion = -1;
			
			publicMethods.nextQuestion();
		},*/
		/**
		 * Display the next question
		 * 
		 * @return this
		 */
		nextQuestion: function()
		{
			var currentExercise = privateMethods.getCurrentExercise();
			var newContent = null;
			
			// hide the "next" button
			_data.elements.btnNext.hide();
			
			// hide the feedback
			_data.elements.feedback.hide();
			
			// show the "check" button
			_data.elements.btnCheck.show();
			
			
			//if(currentExercise.isFinished())
			// if there is no next question
			if(currentExercise.nextQuestion() === false)
			{
				// go to the next exercise
				_data.currentExercise++;
				_data.currentQuestion = -1;
				currentExercise = privateMethods.getCurrentExercise();
				currentExercise.nextQuestion();
				
			}
			// update the title
			_data.elements.title.text(currentExercise.getTitle());
			
			// update the statement
			_data.elements.statement.text(currentExercise.getStatement());
			
			// get the new content to display
			newContent = currentExercise.getContent();
			
			// update the content if necessary
			if(newContent !== null)
			{
				_data.elements.content.html(newContent);
			}
			
			return _data.elements.container;
		},
		
		/**
		 * Check the if the answer given by the user is correct and display the appropriate feedback
		 * 
		 * @return _data.elements.container;
		 */
		checkAnswer: function()
		{
			var currentExercise = privateMethods.getCurrentExercise();
			var feedback = '';
			var feedbackClass = '';
			var firstAttempt = currentExercise.firstAttempt();
			
			if(currentExercise.check() === true)
			{
				if(firstAttempt)
				{
					publicMethods.updateScore();
				}
				
				feedbackClass = settings.feedbackClassOk;
				
				feedback = currentExercise.getFeedback() || settings.feedbackMessageOk;
			}
			else
			{
				feedbackClass = settings.feedbackClassWrong;
				
				feedback = currentExercise.getFeedback() || settings.feedbackMessageWrong;
			}
			
			// update the feedback and show it
			_data.elements.feedback
			.removeClass(settings.feedbackClassOk + ' ' + settings.feedbackClassWrong)
			.addClass(feedbackClass).text(feedback).show();
			
			// show the "next button"
			_data.elements.btnNext.show();
			
			return _data.elements.container;
		},
		
		/**
		 * Update the score
		 * @return _data.elements.container;
		 */
		updateScore: function(newScore)
		{
			if(arguments.length == 0)
			{
				_data.score += settings.scoreIncrease;
				newScore = _data.score;
			}
			
			_data.elements.score.text(newScore + ' / ' + _data.maxScore);
			
			return _data.elements.container;
		},
		
		test: function()
		{
			console.log(this);
		}
	};
	
	
	$.fn.jEasyQuiz = function(params)
	{
		if (publicMethods[params]) 
		{
			return publicMethods[params].apply(this, Array.prototype.slice.call(arguments, 1));
		} 
		else if (typeof params === 'object' || !params) 
		{
			return privateMethods.init.apply(this, arguments);
		} 
		else 
		{
			return $.error('Method ' + params + ' does not exist on jQuery.jEasyQuiz');
		}
	};
})(jQuery);