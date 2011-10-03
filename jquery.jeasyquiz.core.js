/**
 * jQuery plugin : jEasyQuiz
 * Dual licensed under the MIT or GPL Version 2 licenses.
 * http://jquery.org/license
 *
 * @package jEasyQuizz
 * @version alpha 1
 */

/**
 * @TODO try making the drag'n'drop thing smoother with http://jqueryui.com/demos/sortable/
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
		media: false, // whether or not media files (audio|video) are used in the quizz

		// classes of the various containers
		loading: 'quizz_loading', // the class of the element containing the loading informations
		title: 'quizz_title', // the class of the title container
		statement: 'quizz_statement', // the class of the statement container
		score: 'quizz_score', // the class of the score container
		feedback: 'quizz_feedback',
		content: 'quizz_exercise', // the class of the exercise' data container
		actionBar: 'quizz_action_bar', // the class of the action bar, containing the buttons
		dragContainer: 'quizz_drags', // the class of the element that will contain the draggable elements
		dropContainer: 'quizz_drops', // the class of the element that will contain the droppable elements
		
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

		this.firstAttempt = true;

		this.lastQuestion = this.questions.length-1;

		this.input_type = 'radio';
	}

	Exercise.prototype = 
	{
		/**
		 * Get the title of the exercise
		 * 
		 * @return String
		 */
		getTitle: function()
		{ 
			return this.title;
		},

		/**
		 * return the current question (statement + answer) at the specified index
		 * or the current question if no parameter supplied
		 * 
		 * @param index the index of the question that has to be returned
		 * 
		 * @return the question as a jQuey object
		 */
		getQuestion: function(index)
		{
			if(arguments.length == 0)
			{
				index = this.currentQuestion;
			}
			else
			{
				index = parseInt(index);
			}

			return $(this.questions[index]);
		},

		/**
		 * return the answers for the current question
		 * 
		 * @return Array
		 */
		getAnswers: function(type)
		{               
			var selector = 'answer';

			if(type && type.length > 1)
			{
				selector += '[type="' + type + '"]';
			}

			return this.getQuestion().find(selector);
		},

		/**
		 * return the statement of the question at the specified index
		 * or the current question if no parameter supplied
		 * 
		 * @param index the index of the question from which the statement has to be returned
		 * 
		 * @return string
		 */
		getStatement: function(index)
		{
			if(arguments.length == 0)
			{
				index = this.currentQuestion;
			}
			
			return (1+index) + '. ' + this.getQuestion(index).find('statement').text();
		},
		
		/**
		 * Get the content to display for the current question
		 * 
		 * @return DOMFragment
		 */
		getContent: function()
		{
			// cache the document var
			var d = document;
			var answersContainer = d.createElement('ol');
			var answers = this.getAnswers().find('choice');
			var len = answers.length;
			var answer = null;
			var input = null;
			var label = null;
			var i = 0;
			// create a <li> element for each answer 
			// and add it to the container previously created
			for(i; i<len; i++)
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
				answersContainer.appendChild(answer);
			}
						
			return answersContainer;
			
		},

		/**
		 * return an array containing all the questions of the exercise
		 * 
		 * @return Array
		 */
		getTotalQuestions: function()
		{
			return this.questions.length;
		},

		/**
		 * Get the feedback relative to the chosen answer.
		 * 
		 * @return string
		 */
		getFeedback: function()
		{
			var index = _data.elements.content.find('.' + settings.answerClassPicked).parents('li').index();
			var elem = null;

			if(index > -1)
			{
				elem = this.getAnswers().find('choice')[index];

				if(elem)
				{
					return elem.getAttribute('feedback');
				}
			}

			return '';
		},

		/**
		 * Get the index of the next question or false if there's no next question 
		 * i.e. if this question was the last one.
		 * 
		 * @return Number | Boolean
		 */
		nextQuestion: function()
		{                
			if(this.currentQuestion < this.lastQuestion)
			{
				this.firstAttempt = true;
				return this.currentQuestion++;
			}

			return false;
		},

		/**
		 * return true if it's the first time the user answsers this question, false if not
		 * 
		 * @return Boolean
		 */
		isFirstAttempt: function()
		{
			return this.firstAttempt;
		},

		/**
		 * Check if the answer if correct or not
		 * 
		 * @return Boolean
		 */
		check: function() 
		{
			var result = null;
			
			if(this.firstAttempt)
			{
				this.firstAttempt = false;
			}
			
			result = _data.elements.content.find('input[name="' + settings.inputName + '"]:checked');
			
			return result.data('type') == 'true'; 
		},
	
		/**
		 * Return a Boolean meaning if the exercise if finished or not.
		 * 
		 * @return Boolean
		 */
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

		this.images = $(source).find('image');
	}

	PicturePicking.prototype = new Exercise();

	PicturePicking.prototype.getContent = function ()
	{
		var len = this.images.length;
		var container = null;
		var img = null;
		var i = 0;
		
		if(!(this.currentQuestion))
		{
			container = document.createDocumentFragment();
			
			for(i; i<len; i++)
			{
				img = new Image();
				img.src = settings.imagesDir + this.images[i].getAttribute('src');
				$(img).data('match', this.images[i].getAttribute('id'));
				img.alt = this.images[i].textContent;
				img.className = settings.answerClass;
				//img.setAttribute('title', images[i].textContent);

				container.appendChild(img);
			}
		}

		_data.elements.content.find('img.' + settings.answerClass)
		.removeClass(settings.answerClassPicked + ' ' + settings.answerClassCorrect + ' ' + settings.answerClassWrong);
		
		return container;
	};

	PicturePicking.prototype.check = function()
	{
		if(this.firstAttempt)
		{
			this.firstAttempt = false;
		}

		return (_data.elements.content.find('img.' + settings.answerClass + '.' + settings.answerClassPicked)
			.data('match') == this.getQuestion().find('choice').attr('match'));
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
		
		this.rightOrder = '';
	}

	DragAndDrop.prototype = new Exercise();

	DragAndDrop.prototype.getContent = function()
	{
		// cache the document var
		var d = document;
		var dragContainer = d.createElement('ol');
		var dropContainer = d.createElement('ol');
		var container = d.createDocumentFragment();
		var drags = this.getAnswers('drag').find('choice');
		var drops = this.getAnswers('drop').find('choice');

		var len = drags.length;
		var width = _data.elements.content.width()/2 - 11
		var drag = null;
		var drop = null;
		var i = 0;

		dragContainer = $(dragContainer).addClass(settings.dragContainer)
		.css({
			'padding': '0 0 0 10px', 
			'float': 'left', 
			'width': width
		});
		
		dropContainer = $(dropContainer).addClass(settings.dropContainer)
		.css({
			'padding': '0 0 0 10px', 
			'float': 'left', 
			'width': width
		});

		// create and add every elements where the draggables can be dropped (= droppable)
		for(i; i<len; i++)
		{
			// create a list item 
			drop = d.createElement('li');
			drop = $(drop).addClass(settings.droppableClass)
			//.data('id', drops[i].getAttribute('id'))
			.text(drops[i].getAttribute('label'));
				
			// build the rightOrder attribute	
			this.rightOrder += '' + drops[i].getAttribute('id') + '#';
			
			// add it to its container, with the data fetched before
			dropContainer.append(drop);
		}
		
		len = drags.length;
		// create and add every draggable elements to the drag global container
		for(i=0; i<len; i++)
		{
			// create a list item 
			drag = d.createElement('li');
			
			// add it to its container, with all the data fetched before
			dragContainer.append($(drag).addClass(settings.draggableClass)
				.data('match', drags[i].getAttribute('match'))
				.text(drags[i].getAttribute('label')));
		}
		
		dragContainer.sortable({
			containment: 'parent',
			tolerance: 'pointer',
			axis: 'y'
			
		}).disableSelection();

		// add the drags' and drops' container to the container we return
		container.appendChild(dropContainer[0]);
		container.appendChild(dragContainer[0]);
		container.appendChild($('<hr />', {'style': 'float:none;clear:both;height:0;visibility:hidden;'})[0]);
		
		this.rightOrder = this.rightOrder.split('#');
		
		return container;
	};

	DragAndDrop.prototype.check = function()
	{
		var drags = _data.elements.content.find('.' + settings.dragContainer + ' li');
		//var drops = _data.elements.content.find('.' + settings.dropContainer + ' li');
		var correct = true;
		var currentLi = null;
		var len = drags.length;
		var index = 0;
		var i = 0;

		if(this.firstAttempt)
		{
			this.firstAttempt = false;
		}

		for(i; i<len; i++)
		{
			currentLi = drags.eq(i);
			index = currentLi.index();
			
			if(currentLi.data('match') != this.rightOrder[index])
			{
				correct = false;
			}
			else
			{
				currentLi.addClass(settings.answerClassCorrect);
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

	MultipleAnswers.prototype.check = function()
	{
		var answers = _data.elements.content.find('label.' + settings.answerClass + ' input[type="checkbox"]');
		var len = answers.length;
		var check = true;
		var $answer = null;
		var i = 0;
		
		if(this.firstAttempt)
		{
			this.firstAttempt = false;
		}

		for(i; i<len; i++)
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
							_data.elements.actionBar.before($('<h2 />', {
								"class": settings.title
							}));
						}
						
						if(_data.elements.container.find('.' + settings.statement).length == 0)
						{
							_data.elements.actionBar.before($('<h3 />', {
								"class": settings.statement
							}));
						}
						
						if(_data.elements.container.find('.' + settings.content).length == 0)
						{
							_data.elements.actionBar.before($('<div />', {
								"class": settings.content
							}));
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
								
								// set the initial score
								publicMethods.updateScore(settings.initialScore);

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
						
						_data.elements.content.find('.' + settings.answerClass)
						.live('click.' + settings.eventNamespace, function()
						{
							_data.elements.content.find('.' + settings.answerClass)
							.removeClass(settings.answerClassPicked);
							
							$(this).addClass(settings.answerClassPicked);
						});
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
			var i = 0;
			
			for(i; i<len; i++)
			{
				//switch (rawExercises.eq(i).attr('type')) 
				switch (rawExercises[i].getAttribute('type'))
				{
					case 1 : 
					case '1' :
					case 'PicturePicking' : 
					case 'pp' :
						_data.exercises.push(new PicturePicking(rawExercises[i]));
						_data.totalQuestions += _data.exercises[i].getTotalQuestions();
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
						_data.totalQuestions += _data.exercises[i].getTotalQuestions();
						break;
					case 4 : 
					case '4' : 
					case 'MultipleAnswers' : 
					case 'ma' :
						_data.exercises.push(new MultipleAnswers(rawExercises[i]));
						_data.totalQuestions += _data.exercises[i].getTotalQuestions();
						break;
					case 5 : 
					case '5' : 
					case 'dd' :
					case 'DragAndDrop' : 
					case 'dnd' :
						_data.exercises.push(new DragAndDrop(rawExercises[i]));
						_data.totalQuestions += _data.exercises[i].getTotalQuestions();
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
			_data.elements.statement.html(currentExercise.getStatement());
			
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
			var firstAttempt = currentExercise.isFirstAttempt();
			
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
			.addClass(feedbackClass).text(feedback).hide().fadeIn();
			
			// show the "next button"
			_data.elements.btnNext.fadeIn();
			
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