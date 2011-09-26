/**
 * Fichier de définition du plugin jEasyQuiz pour jQuery
 *
 * 4 types d'exercice :
 *   - sélection de zone
 *   - drag & drop
 *   - mot manquant
 *   - phrase manquante
 *   
 *   
 *   @package: jEasyQuizz alpha 1
 *   
 *   TODO : feedback par fonction
 *   TODO : CSS
 */




(function($)
{
	$.fn.jEasyQuiz = function(options)
	{
		/**
         * default parameters
         */
		var defaults =
		{
			// main options
			source: '', // URL of the file containing the exercises' data
			data: {}, // data to send to the source file
			request_method: 'get', // source file request method (MUST BE either 'get' or 'post')
			//exercises_order: {MissingWord: 0, AudioMatching: 1, PicturePicking: 2, DragAndDrop: 3}, // the order in which the exercises will appear. set a index to null to dismiss an exercise
			audio: false, // wether or not audio files are used in the quizz
            
            
			// ids of the various containers
			loading: 'quizz_loading', // the id of the element containing the loading informations
			title: 'quizz_title', // the id of the title container
			statement: 'quizz_statement', // the id of the statement container
			score: 'quizz_score', // the id of the score container
			feedback: 'quizz_feedback',
			exercise: 'quizz_exercise', // the id of the exercise container, i.e. the element where the user will click and drag'n'drop
			action_bar: 'quizz_action_bar', // the id of the action bar, containing the buttons
			mp3player_container: 'quizz_mp3player_c', // the id of the element containing the mp3player
			mp3player: 'quizz_mp3player', // the id of the mp3player itself
			drag_container: 'quizz_drags', // the id of the element that will contain the draggable elements
            
			// buttons and inputs
			btn_next: 'quizz_btn_next', // the id of the 'Next' button
			btn_go: 'quizz_btn_go', // the id of the 'GO' button
			btn_check: 'quizz_btn_check', // the id of the 'Check' button
			input_name: 'quizz_word_answer', // the name attribute to use on the radio inputs

			// CSS classes
			picked_class: 'quizz_picked', // the class to add to an answer when the user selects it (can be personalised in quizz.css)
			correct_class: 'quizz_correct', // the class to add to the picked answer if it's correct (can be personalised in quizz.css)
			wrong_class: 'quizz_wrong', // the class to add to the picked answer if it's wrong (can be personalised in quizz.css)
			missing_label_class:'quizz_missing', // the class to add labels of the Missing exercises (can be personalised in quizz.css)
			draggable_class: 'quizz_draggable', // the class to add to the draggable elements (can be personalised in quizz.css)
			droppable_class: 'quizz_droppable', // the class to add to the droppable elements (can be personalised in quizz.css)
			feedback_ok_class: 'quizz_feedback_ok',
			feedback_wrong_class: 'quizz_feedback_wrong',
            
			// score infos
			initial_score: 0, // the initial score when begining the quizz
			score_increase: 1, // the amount of points to add to the current score when a good answer is chosen on first attempt
            
			// directories & URLs
			images_dir: 'images/', // the directory to load the images from
			audio_dir: 'audio/', // the directory to load the audio files from
			mp3player_URL: 'assets/mp3player.swf', // the directory to load the mp3player from

			// misc
			feedback_ok: 'Good answer !', // the default feedback message to show on a good answer
			feedback_wrong: 'Bad answer...', // the default feedback message to show on a bad answer
			event_namespace: 'quizz', // a namespace to use for all the events related to the quizz (prevents other events from interfering)
			blank_element: 'span', // the element containing the blank placeholder
			end_handler: function(score, time, percent)
			{ 
				alert('Final score: ' + score + "\n"
					+ 'Total time: ' + time.h + ':' + time.m + ':' + time.s + "\n"
					+ 'Percentage of correct answers: ' + percent + '%');
			}
		};

		options = $.extend(defaults, options);


		//<editor-fold defaultstate="collapsed" desc="Exercises">
		// Exercise Class
		$.fn.jEasyQuiz.Exercise = function(source)
		{
			var $source = $(source);

			this.title = $source.find('title').text();

			this.questions = $source.find('question');

			this.current_question = -1;

			this.initialized = false;

			this.last_question = this.questions.length-1;

			this.input_type = 'radio';

			this.type = parseInt($source.attr('type'));
		}

		$.fn.jEasyQuiz.Exercise.prototype = 
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
					index = this.current_question;
				else
					index = parseInt(index);

				return (1+index) + '. ' + $(this.questions[index]).find('statement').text();
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
					index = this.current_question;
				else
					index = parseInt(index);

				return this.questions[index];
			},

			getQuestionNum: function()
			{
				return this.current_question;
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

				return $(this.questions[this.current_question]).find(selector) ;
			},

			/**
			 * get the feedback relative to the chosen answer
			 * 
			 * @return string
			 */
			getFeedback: function()
			{
				var index = $('.' + options.picked_class).index();
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
				if(this.current_question < this.last_question)
				{
					this.initialized = false;
					return this.current_question++;
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
			 * default display function, can be overriden by subclass
			 * displays a list of all the answers in radio <input>
			 */
			display: function($container) 
			{
				// get all the possible answers
				var answers = $(this.getAnswers()).find('choice');
				// get the URL of the audio file to play if specified
				var audio_source = this.getAnswers()[0].getAttribute('audio');
				// create an ordered list to contain the answers
				var answers_container = document.createElement('ol');
				var answer;
				var label;
				var input;
				var len = answers.length;

				// empty the container
				$container.html('');

				// create a <li> element for each answer 
				// and add it to the container previously created
				for(var i = 0; i<len; i++)
				{
					input = document.createElement('input');
					label = document.createElement('label');
					answer = document.createElement('li');

					input.type = this.input_type;
					input.name = options.input_name;
					$(input).data('type', answers[i].getAttribute('type'));

					label.className = options.missing_label_class;

					// answer.id = i;

					label.appendChild(input);
					label.appendChild(document.createTextNode(answers[i].getAttribute('label')));
					answer.appendChild(label);
					answers_container.appendChild(answer);
				}

				// add the list of answers to the DOM
				$container.append(answers_container);

				// if specified, display the player and load the audio file
				if(options.audio && audio_source)
				{
					try
					{
						$('#' + options.mp3player_container).show();
						this.getPlayer().load(options.audio_dir + audio_source);
					}
					catch(error)
					{
						try {
							console.log(error)
							}
						catch(e) {}
					}
				}
				else
				{
					$('#' + options.mp3player_container).hide();
				}
			},

			/**
			 * default check function, can be overriden by subclass
			 * 
			 * @return boolean
			 */
			check: function($exercise_c) 
			{
				if(!(this.initialized))
				{
					this.initialized = true;
				}

				return ($exercise_c.find('input:checked').data('type') == 'true');
			},

			finished: function()
			{
				return (this.current_question == this.last_question);
			},
			reset: function()
			{
				this.initialized = false;
				this.current_question = -1;
			},
			getPlayer: function()
			{
				try
				{
					if(!jwplayer(options.mp3player) || jwplayer(options.mp3player).getState() == null)
					{
						jwplayer(options.mp3player).setup({
							flashplayer: options.mp3player_URL,
							height: 29,
							width: 270,
							fullscreen: false,
							autostart: false,
							skin: 'assets/data/eclient-skin-audioplayer.zip',
							screencolor: 'CCCCCC',
							controlbar: 'top'
						});
					}
					return jwplayer(options.mp3player);
				}
				catch(error)
				{
					// desperate last chance
					try {
						console.log(error)
						}
					catch(e) {}
				}
			}
		}


		/**************************************************************************************************/
		// PicturePicking Class
		$.fn.jEasyQuiz.PicturePicking = function(source)
		{
			$.fn.jEasyQuiz.Exercise.call(this, source);

			this.zones = $(source).find('zone');
		}

		$.fn.jEasyQuiz.PicturePicking.prototype = new $.fn.jEasyQuiz.Exercise();

		$.fn.jEasyQuiz.PicturePicking.prototype.getZones = function()
		{
			return this.zones;
		};

		$.fn.jEasyQuiz.PicturePicking.prototype.getZone = function(index)
		{
			if(!index)
				index = this.current_question;
			else
				index = parseInt(index);

			return this.zones[index];
		}

		$.fn.jEasyQuiz.PicturePicking.prototype.display = function ($container)
		{
			var audio_source = this.getAnswers()[0].getAttribute('audio');

			if(!(this.current_question))
			{
				$container.html('');

				var zones = this.zones;
				var img;
				var len = zones.length;

				for(var i=0; i<len; i++)
				{
					img = new Image();
					img.src = options.images_dir + zones[i].getAttribute('picture');
					img.id = zones[i].getAttribute('id');
					img.alt = zones[i].textContent;
					//img.setAttribute('title', zones[i].textContent);

					$container.append(img);
				}
			}

			// if specified, display the player and load the audio file
			if(options.audio && audio_source)
			{
				try
				{
					$('#' + options.mp3player_container).show();
					this.getPlayer().load(options.audio_dir + audio_source);
				}
				catch(error)
				{
					try {
						console.log(error)
						}
					catch(e) {}
				}
			}
			else
			{
				$('#' + options.mp3player_container).hide();
			}

			$container.find('img').removeClass();
		}

		$.fn.jEasyQuiz.PicturePicking.prototype.check = function($exercise_c)
		{
			if(!(this.initialized))
			{
				this.initialized = true;
			}

			return ($exercise_c.find('img.' + options.picked_class).attr('id') == ($(this.questions[this.current_question]).find('choice').attr('id')))
		}

		/**************************************************************************************************/
		// DragAndDrop Class
		$.fn.jEasyQuiz.DragAndDrop = function(source)
		{
			$.fn.jEasyQuiz.Exercise.call(this, source);
		}

		$.fn.jEasyQuiz.DragAndDrop.prototype = new $.fn.jEasyQuiz.Exercise();

		$.fn.jEasyQuiz.DragAndDrop.prototype.display = function($container)
		{
			// get the data of the draggable elements
			var drags = this.getAnswers('drag').find('choice');
			//get the data of the elements where the draggable elements will be dropped
			var drops = this.getAnswers('drop').find('choice');
			var audio_source = this.getAnswers()[0].getAttribute('audio') || this.getAnswers()[1].getAttribute('audio');
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

			// if specified, display the player and load the audio file
			if(options.audio && audio_source)
			{
				try
				{
					$('#' + options.mp3player_container).show();
					this.getPlayer().load(options.audio_dir + audio_source);
				}
				catch(error)
				{
					try {
						console.log(error)
						}
					catch(e) {}
				}
			}
			else
			{
				$('#' + options.mp3player_container).hide();
			}     
		}

		$.fn.jEasyQuiz.DragAndDrop.prototype.check = function($container)
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

		}

		/**************************************************************************************************/
		// MultipleAnswers Class
		$.fn.jEasyQuiz.MultipleAnswers = function(source)
		{
			$.fn.jEasyQuiz.Exercise.call(this, source);

			this.input_type = 'checkbox';
		}

		$.fn.jEasyQuiz.MultipleAnswers.prototype = new $.fn.jEasyQuiz.Exercise();

		$.fn.jEasyQuiz.MultipleAnswers.prototype.check = function($container)
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

		}
		//</editor-fold>


		this.exercises = [];
		this.score = options.initial_score;
		this.feedbackContainer = null;
		this.exerciseContainer = null;
		this.currentExercise = 0;

		/*****************************************************************************************
		 EXERCISES
		 *****************************************************************************************/     
 
		//WHERE THE MAGIC TAKES PLACE
		return this.each(
			function()
			{
				// attributes
				var score = options.initial_score;
				var total_questions = 0;
				var exercise_num = 0;
				var exercises = new Array();
				var start_date = Date.parse(new Date());

				// store this in a local variable to avoid conflict
				var container = this;                
                
				// hide the containers on start
				var $title_c = $('#' + options.title, container).hide();
				var $statement_c = $('#' + options.statement, container).hide();
				var $exercise_c = $('#' + options.exercise,container).hide();
				var $action_bar = $('#' + options.action_bar, container).hide();
				var $feedback_c = $('#' + options.feedback).hide();
				var $score_c = $('#' + options.score, container).hide();
                
				//$('#' + options.mp3player_container).hide();
                
				var $btn_go = $('#' + options.btn_go, container).hide();
                
				$('#' + options.mp3player_container, container).hide(); // we don't need to store it
                
				// display an error message if the minimum mandatory parameters aren't supplied
				if(!options.source || !(options.request_method == 'get' || options.request_method == 'post'))
				{
					container.innerHTML = '<h2>ERROR : You must specify at least the source file URL and a valid method to load it.</h2>';
				}
				else
				{
					// load the xml data containing the exercises
					$.ajax(
					{
						type: options.request_method,
						async: true,
						url: options.source,
						data: (options.data),
						dataType: 'xml',
						// if the loading succes
						success: function(data)
						{
							console.log(this);
							var source = $(data).find('exercise');
							var i = 0;
							var len = source.length;
							for(i; i<len; i++)
							{
								switch(source[i].getAttribute('type'))
								{
									case 1 : case '1' :
									case 'PicturePicking' : case 'pp' :
										exercises.push(new $.fn.jEasyQuiz.PicturePicking(source[i]));
										total_questions += exercises[i].getQuestions().length;

										break;
									case 2 : case '2' :
									case 'MissingWord' : case 'mw' :
										exercises.push(new $.fn.jEasyQuiz.Exercise(source[i]));
										total_questions += exercises[i].getQuestions().length;

										break;
									case 3 : case '3' :
									case 'AudioMatching' : case 'am' :
										exercises.push(new $.fn.jEasyQuiz.Exercise(source[i]));
										total_questions += exercises[i].getQuestions().length;

										break;
									case 4 : case '4' : 
									case 'MultipleAnswers' : case 'ma' :
										exercises.push(new $.fn.jEasyQuiz.MultipleAnswers(source[i]));
										total_questions += exercises[i].getQuestions().length;
										break;
									case 5 : case '5' : case 'dd' :
									case 'DragAndDrop' : case 'dnd' :
										exercises.push(new $.fn.jEasyQuiz.DragAndDrop(source[i]));
										total_questions += exercises[i].getQuestions().length;
										break;
								}
							}
                            
							// hide the loading message and show the 'GO' button
							$btn_go.fadeIn(500).siblings().remove();

						},
						// display an error message if the loading fails
						error: function(jqXHR, text_status, error)
						{
							container.innerHTML = '<h2>ERROR (' + text_status + '): Unable to load the exercise\'s data.</h2><p>The server answered : ' + error + '</p>';
						}
					});
					
					this.exercises = exercises;
                    // 'GO' button action binding
					// start the quizz when the button is pressed
					$btn_go.bind(
						'click.' + options.event_namespace, 
						function()
						{
							// go to the first question of the first exercise
							exercises[exercise_num].nextQuestion();

							// update the title, the statement and initialize the score
							$title_c.text(exercises[exercise_num].getTitle());
							$statement_c.html(exercises[exercise_num].getStatement());
							$score_c.text(options.initial_score);

							// display the first exercise
							exercises[exercise_num].display($exercise_c);

							// add the maximum score infos so the 
							// score is displayed like '15/20' and not just '15'
							$score_c.after('/' + (total_questions*options.score_increase));

							// hide the loading div and display the containers of the quizz
							$('#' + options.loading).hide();
							$title_c.fadeIn(500);
							$statement_c.fadeIn(500);
							$exercise_c.fadeIn(500);
							$action_bar.fadeIn(500);
							$score_c.fadeIn(500);

							// hide the 'Next' button
							$('#' + options.btn_next).hide();
							// since we don't need it any longer, remove it from the DOM
							$(this).remove();
						}
					);
                    
					// 'Check' button action binding
					// check if the chosen answer is the good one and display some feedback
					$('#' + options.btn_check, container).bind(
						'click.' + options.event_namespace,
						function()
						{
							var first_attempt = exercises[exercise_num].firstAttempt();
							var check = exercises[exercise_num].check($exercise_c);
							var $answer = $exercise_c.find('.' + options.picked_class).removeClass(options.picked_class);

							var answer_class_a = options.correct_class;
							var answer_class_r = options.wrong_class;
							var feedback_class_a = options.feedback_ok_class;
							var feedback_class_r = options.feedback_wrong_class;
							var feedback_message = options.feedback_ok;

							// if the answer is correct
							if(check)
							{
								// increase the score if it's found on the first attempt
								if(first_attempt)
								{
									score += options.score_increase;
									$score_c.text(score);
								}                                
							}
							// if the answer is wrong
							else
							{
								//switch the classes
								answer_class_a = options.wrong_class;
								answer_class_r = options.correct_class;
								feedback_class_a = options.feedback_wrong_class;
								feedback_class_r = options.feedback_ok_class;
								feedback_message = options.feedback_wrong;
							}

							// add visual feedback (can be personalised in the quizz.css file)
							if(exercises[exercise_num].type <= 3)
							{
								$answer.addClass(answer_class_a);
								$statement_c.find(options.blank_element).removeClass(answer_class_r).addClass(answer_class_a);
							}

							$feedback_c
							.hide()
							.removeClass(feedback_class_r)
							.addClass(feedback_class_a)
							.text(exercises[exercise_num].getFeedback() || feedback_message);
							$feedback_c.show(500);

							// show the 'Next' button
							$('#' + options.btn_next).show();
						}
					);

					// 'Next' button action binding
					// go to the next question on click
					$('#' + options.btn_next, container).bind(
						'click.' + options.event_namespace, 
						function()
						{
							// if the current exercise is finished
							if(exercises[exercise_num].finished())
							{
								// go to the next exercise if there is one 
								if(exercise_num != (exercises.length-1))
								{
									exercise_num++;
								}
								// or dislpay the end screen
								else
								{
									var timestamp = Math.round((Date.parse(new Date()) - start_date)/1000);
									var h = (timestamp - timestamp%3600)/3600;
									var m = (timestamp - timestamp%60)/60;
									var s = timestamp - 3600*h - 60*m;
                                    
									if(h<10) h = '0' + h ;
									if(m<10) m = '0' + m ;
									if(s<10) s = '0' + s;
                                    
									if(typeof(options.end_handler) == 'function')
									{
										options.end_handler.apply(
											null, 
											[
											score + "/" + (total_questions*options.score_increase), 
											{
												h:h, 
												m:m, 
												s:s
											}, 
											Math.round(100*(score-options.initial_score)/(options.score_increase*total_questions))
											]
											);
									}
                                    
									return false; // stop here
								}
							}

							// go to the next question
							exercises[exercise_num].nextQuestion();

							// update the title and statement
							$title_c.text(exercises[exercise_num].getTitle());
							$statement_c.html(exercises[exercise_num].getStatement());

							// display the exercise
							exercises[exercise_num].display($exercise_c);
                            
							$(this).hide();
							$feedback_c.hide();
                            
							return true;
						}
					);
                        
                        
					// VISUAL FEEDBACK : highlight the selected answer
					// PicturePicking, AudioMatching and MissingWord
					$exercise_c.find('ol li:not(.ui-droppable) label, img').live(
						'click.' + options.event_namespace,
						function()
						{
							var $clicked = $(this);
                            
							$clicked.parents('#' + options.exercise).find('.' + options.picked_class).removeClass(options.picked_class);
							$clicked.addClass(options.picked_class);
						}
					);
                        
					// MissingWord only : replace the blank placeholder in the statement by the answer clicked by the user
					$('label.' + options.missing_label_class, container).live(
						'click.' + options.event_namespace,
						function()
						{
							$statement_c.find(options.blank_element).removeClass(options.correct_class + ' ' + options.wrong_class).text($(this).text());
						}
					);                    
				} // else
			} // function
			); // return
	};
})(jQuery); // pass the jQuery object to the function to avoid conflict with the $ sign.