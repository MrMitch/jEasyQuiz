// Exercise Class
function Exercise(source)
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
function PicturePicking(source)
{
	Exercise.call(this, source);

	this.zones = $(source).find('zone');
}

PicturePicking.prototype = new Exercise();

PicturePicking.prototype.getZones = function()
{
	return this.zones;
};

PicturePicking.prototype.getZone = function(index)
{
	if(!index)
		index = this.current_question;
	else
		index = parseInt(index);

	return this.zones[index];
}

PicturePicking.prototype.display = function ($container)
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

PicturePicking.prototype.check = function($exercise_c)
{
	if(!(this.initialized))
	{
		this.initialized = true;
	}

	return ($exercise_c.find('img.' + options.picked_class).attr('id') == ($(this.questions[this.current_question]).find('choice').attr('id')))
}

/**************************************************************************************************/
// DragAndDrop Class
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

}

/**************************************************************************************************/
// MultipleAnswers Class
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

}