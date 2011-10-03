(function($)
{
	
	var _data = {
		initialized: false,
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
	
	
	var privateMethods = {
		
		init: function()
		{
			//_data = data;
			
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
				firstAttempt: function()
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
				.data('match') == this.getQuestion().find('choice').attr('id'));
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

			DragAndDrop.prototype.getContent = function()
			{
				// cache the document var
				var d = document;
				var dragContainer = d.createElement('ul');
				var dropContainer = d.createElement('ol');
				var container = d.createDocumentFragment();
				var drags = this.getAnswers('drag').find('choice');
				var drops = this.getAnswers('drop').find('choice');

				var len = drags.length;
				var drag = null;
				var drop = null;
				var i = 0;

				dragContainer.className = settings.dragContainer;
				$(dropContainer).addClass(settings.dropContainer).css({paddingTop:"15px", paddingBottom:"15px"});

				// create and add every draggable elements to the drag global container
				for(i; i<len; i++)
				{
					// create a draggable element from the data fetched before
					drag = d.createElement('li');
					drag.className = settings.draggableClass;
					drag.innerHTML = drags[i].getAttribute('label');
					//drag.id = drags[i].getAttribute('id');

					// make it draggable
					$(drag).data({id: drags[i].getAttribute('id'), quizz_position: 0}).draggable(
					{
						// draggable elements can't go out of the content container
						containment: _data.elements.content,
						cursor: 'crosshair',
						snap: '.ui-droppable',
						snapMode: 'inner',
						// revert the position if not dropped on a droppable element
						revert: 'invalid'
					});

					//$(drag).draggable.helper.data('quizz_position', 'nok');

					// add it to its container
					dragContainer.appendChild(drag);
				}

				len = drops.length;
				// create and add every elements where the draggables can be dropped (= droppable)
				for(i=0; i<len; i++)
				{
					// create a droppable element from the data fetched before
					drop = d.createElement('li');
					drop.className = settings.droppableClass;
					drop.innerHTML = drops[i].getAttribute('label');

					// make it droppable
					$(drop).data('accept', drops[i].getAttribute('id')).droppable(
					{
						tolerance: 'touch',
						hoverClass: settings.answerClassPicked,
						drop: function(e, draggable)
						{
							if(_data.elements.content.find('.' + settings.answerClassPicked).length > 1)
							{
								draggable.draggable("revert");
							}
							else
							{
								(draggable.helper.data('id') == $(this).data('accept'))
								? draggable.helper.data('quizz_position', 1)
								: draggable.helper.data('quizz_position', 0);

								//$(this).droppable("disable", true);
							}
						}
					});

					// add it to its container
					dropContainer.appendChild(drop);
				}

				// make the global container droppable
				$(dragContainer).droppable(
				{
					// reset the data-position when a draggable is dropped
					drop: function(e, draggable)
					{
						draggable.helper.data('quizz_position', 0);
					}
				});

				// add the drags' and drops' container to the container we return
				container.appendChild(dragContainer);
				container.appendChild(dropContainer);

				return container;
			};

			DragAndDrop.prototype.check = function()
			{
				var li = _data.elements.content.find('.' + settings.dragContainer + ' li.ui-draggable');
				var correct = true;
				var $currentLi = null;
				var len = li.length;
				var i = 0;

				if(this.firstAttempt)
				{
					this.firstAttempt = false;
				}

				for(i; i<len; i++)
				{
					$currentLi = $(li[i]);
					if($currentLi.data('quizz_position') == 0)
					{
						correct = false;
						$currentLi.css({left: 0, top:0});
					}
					else
					{
						$currentLi.addClass(settings.answerClassCorrect).draggable("disable"/*{cancel: 'li'}*/);
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
			
			_data.initialized = true;
		}
		
		
	};
	
	
	var publicMethods = {
		
		dragAndDrop: function(source)
		{
			return new DragAndDrop(source);
		},
		
		singleAnswer: function(source)
		{
			return new Exercise(source);
		},
		
		multipleAnswers: function(source)
		{
			return new MultipleAnswers(source);
		},
		
		mediaMatching: function(source)
		{
			return new Exercise(source);
		},
		
		picturePicking: function(source)
		{
			return new PicturePicking(source);
		}
		
	};
	
	

	$.fn.exerciseFactory = function(params)
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
			return $.error('Bad exercise type: ' + params);
		}
	};

})(jQuery);