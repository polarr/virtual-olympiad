> Outdated. This is the guide for the old VO
## Creating/Joining a Room
![image](https://user-images.githubusercontent.com/51487023/124961572-a5637780-dfeb-11eb-9580-b77df2e355b2.png)

First, enter a name in the *Enter a name* input box. It can be 1-12 characters long. <br>
To create a room, simply select your game mode from the dropdown and click *Create Room*! (Currently only game mode is Normal but more will be added soon) <br>
To join a room, paste the room code into the *Code* input box and click *Join Room*!

## Selecting Game Details
If you are the owner of the room, you can configure the time limit, question amount, and question sources for the game. Other players in the room will be able to view what you have selected. 

![image](https://user-images.githubusercontent.com/51487023/124961284-4271e080-dfeb-11eb-8bb1-45b26aa3a3ff.png)

- Question Amount: 1-50 questions
- Time Limit: 5-180 minutes
- Question Sources: AMC 8, AMC 10, AMC 12, AIME (more to come!)

Once you have finished configuring game details, click "Start Game".

### How questions are generated
It will take around 3-5 seconds for the server to generate your questions.

The server generates roughly equal amount of questions from each source selected. For example, if you chose AMC 8, AMC 10, and AIME with 12 questions total, it will generate 4 questions from each source.

For each source, the questions are purely randomly selected from all the previous contests of the same format as the current format. For example, AMC 10 questions will be randomly selected from Q1-25 of AMC 10 A/Bs during 2002-2020.

Finally, all the questions are sorted by a difficulty algorithm that takes into account the test (AIME > AMC 10), question number (Q13 > Q2), and year (2020 > 2002). This can obviously not a perfect representation of difficulty, but it is highly accurate enough.

## During the Game
During a game, you will see the timer on the top left, the *Submit* button on the top right, and between those are the statuses of the players (*Answering*/*Submitted*).

![image](https://user-images.githubusercontent.com/51487023/124964005-80bccf00-dfee-11eb-8c03-99ee10be4b8b.png)


The questions will be shown below. For multiple choice questions, simply input the character of the answer (lowercase will be automatically converted upon submission).

![image](https://user-images.githubusercontent.com/51487023/124964066-903c1800-dfee-11eb-8f4c-248dd86ebfd5.png)


For AIME questions, input the integer answer (leading zeroes will be automatically accounted for).

### Submitting
To submit your answers, simply click the *Submit* button. Once the timer hits 0, your answers will be automatically submitted.

![image](https://user-images.githubusercontent.com/51487023/124964754-5e778100-dfef-11eb-8ade-dacf51789359.png)
![image](https://user-images.githubusercontent.com/51487023/124964975-a0082c00-dfef-11eb-83db-2ac864b17271.png)

Once you submit your answers, you will have access to the question link and answer. The timer will display *Time Used* and the submit button will display your score. Your status will also change to *Submitted*.

### Finishing a game

Once the timer is up or everyone has submitted, the game will be finished. <br>
You will be able to see the rankings of the players, by how many questions they got correct, and then by the time used.

![image](https://user-images.githubusercontent.com/51487023/124965257-e6f62180-dfef-11eb-978b-b2cf599ed4ad.png)

Below that you will still have access to your answers and the questions.
