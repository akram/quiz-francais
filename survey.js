'use strict'
var mongoose = require('mongoose');

let schema = new mongoose.Schema({
  surveyName: String,
  business: [String],
  department: String,
  period: {
    start: Date,
    end: Date
  },
  responsible: String,
  clients: [String],
  questions: [{
    name: String,
    title: String,
    formType: String,
    isRequired: Boolean,
    inputType: String,
    choices: [String],
    clients: [String],
    service: String,
    mininumRateDescription: String,
    maximumRateDescription: String,
    choicesValue: [{
      name: String,
      value: Number
    }],
    rateValues: [Number],
    showChoices: Boolean,
    created: Date
  }],
  uniqueResponses: Boolean,
  finalGrade: Number,
  active: Boolean,
  general: Boolean,
  created: Date
})

module.exports = mongoose.model('Survey', schema);

function buildSurvey(survey) {

   //STEP 1. Set each form type to type (ONLY IF BRINGING DATA FROM MONGODB) 
    survey.questions = survey.questions.map(question => {
      question.type = question.formType;
      return question;
    });

    //STEP 2. Group the survey by a specific field (service in my case) in order to separate the survey in pages
    let groupedSurvey = commonFactory.groupBy(survey.questions, 'service');
    let pages = [];

    //STEP 3. Loop through "service" and create a page with all the questions. Push it to the pages array. 
    Object.keys(groupedSurvey).forEach((element) => {
      pages.push({
        questions: groupedSurvey[element]
      });
    });

   $scope.completeSurvey = survey;
   //STEP 4. Build the surveyModel using the pages previous built.
   Survey.Survey.cssType = "bootstrap"; //Sets SurveyJS default CSS as Bootstrap (to match theme)
    var surveyModel = new Survey.Model({
      title: survey.surveyName,
      pages: pages
    });
    
    //Configuration options for the model.
    surveyModel.showProgressBar = "top";
    surveyModel.pagePrevText = "Atras";
    surveyModel.pageNextText = "Siguiente";
    surveyModel.completeText = "Completar encuesta";
    surveyModel.completedHtml = "<h5>Gracias por completar la encuesta! </h5>"

    //STEP 5. Select main survey container and instantiate a new survey passing the model, custom CSS, and a custom method when submitting data.
    $(".survey").Survey({
      model: surveyModel,
      css: surveyCustomCSS,
      onComplete: sendDataToServer
    });
}

let surveyCustomCSS = {
    root: "survey-container",
    row: "row-separator",
    pageTitle: "sv_p_title",
    question: {
      root: "sv_q",
      title: "sv_q_title"
    },
    checkbox: {
      root: 'sv_q_checkbox'
    },
    radiogroup: {
      root: 'sv_q_radiogroup'
    },
    rating: {
      root: 'sv_q_rating',
      item: 'sv_q_rating_item'
    },
    navigationButton: "btn  btn-primary"
  };



function sendDataToServer(survey) {
    const data = survey.data;

    //Builds response object with user information
    const response = {
      job: $rootScope.client.job,
      results: [],
      timestamp: new Date(),
      client: {
        _id: $rootScope.client._id,
        username: $rootScope.client.username
      }
    };

    //Build a result for each answered question
    for (var question of Object.keys(data)) {
      //Gets selected question
      const selectedQuestions = $scope.completeSurvey.questions.filter(e => {
        return e.name === question;
      });

      //if no questions found, break the loop
      if (selectedQuestions.length === 0)
        break;

      //grabs the selected question
      const selectedQuestion = selectedQuestions[0];

      response.surveyId = $scope.completeSurvey._id;
      //builds a result object with the selected question and the answer
      const result = {
        service: selectedQuestion.service,
        question: question,
        formType: selectedQuestion.formType,
        answer: data[question],
        rates: selectedQuestion.rateValues
      };

      //Questions that has a value process differently... 
      if (selectedQuestion.formType === 'checkbox' || selectedQuestion.formType === 'dropdown' || selectedQuestion.formType === 'radiogroup') {
        //grabs the possible values per question
        const values = selectedQuestion.choicesValue.map(e => {
          return e.value;
        });
        //if there are multiple question, the answer will be one concatenated string
        if (data[question] instanceof Array) {
          result.answer = data[question].join();
          const answerValues = [];
          //set the value per answer
          data[question].forEach(e => {
            answerValues.push(values[selectedQuestion.choices.indexOf(e)]);
          });
          //sets the joined value of all answers
          result.value = answerValues.join();
        } else {
          result.value = values[selectedQuestion.choices.indexOf(data[question])] + '';
        }
      }

      response.results.push(result);
    }

    $http.post('/api/surveys/responses/', response)
      .then(function(response) {
        console.log(response);
      })
      .catch(function(error) {
        console.log(error);
      });
  }


