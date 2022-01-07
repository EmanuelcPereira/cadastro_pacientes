'use strict';

const AWS = require("aws-sdk")
const { v4: uuid } = require('uuid');

const dynamoDb = new AWS.DynamoDB.DocumentClient();
const params = {
  PACIENTES_TABLE: 'PACIENTES-${opt:stage, self:provider.stage}',
}

module.exports.listarPacientes = async (event) => {
  try {
    const queryString = {
      limit: 5,
      ...event.queryStringParameters
    }
    const { limit, next } = queryString

    let localParams = {
      ...params,
      Limit: limit
    }

    if (next) {
      localParams.ExclusiveStartKey = {
        paciente_id: next
      }
    }

    let data = await dynamoDb.scan(localParams).promise()

    let nextToken = data.LastEvaluatedKey != undefined
      ? data.LastEvaluatedKey.paciente_id
      : null

    const result = {
      items: data.Items,
      next_token: nextToken
    }

    return {
      statusCode: 200,
      body: JSON.stringify(result),
    }
  } catch (err) {
    return {
      statusCode: err.statusCode ? err.statusCode : 500,
      body: JSON.stringify({
        error: err.name ? err.name : "Exception",
        message: err.message ? err.message : "Internal server error",
      })
    }
  }
};

module.exports.obterPaciente = async (event) => {
  try {
    const { pacienteId } = event.pathParameters

    const data = await dynamoDb.get({
      ...params,
      key: {
        paciente_id: pacienteId
      }
    }).promise()

    if (!data.Item) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: "Paciente not found" }, null, 2)
      }
    }
    return {
      statusCode: 200,
      body: JSON.stringify(paciente, null, 2),
    };
  } catch (err) {
    return {
      statusCode: err.statusCode ? err.statusCode : 500,
      body: JSON.stringify({
        error: err.name ? err.name : "Exception",
        message: err.message ? err.message : "Internal server error",
      })
    }
  }
};

module.exports.cadastrarPaciente = async (event) => {
  try {

    let dados = JSON.parse(event.body)

    const { nome, dataNascimento, email, telefone } = dados

    const date = new Date().getTime()

    const paciente = {
      paciente_id: uuid(),
      nome, 
      dataNascimento,
      email,
      telefone,
      status: true,
      created_at: date,
      updated_at: date
    }

    await dynamoDb.put({ TableName: 'PACIENTES', Item: paciente }).promise()

    return {
      statusCode: 201
    }

  } catch (err) {
    return {
      statusCode: err.statusCode ? err.statusCode : 500,
      body: JSON.stringify({
        error: err.name ? err.name : "Exception",
        message: err.message ? err.message : "Internal server error",
      })
    }
  }
}

module.exports.atualizarPaciente = async (event) => {  
  const { pacienteId } = event.pathParameters

  try {
    const timestamp = new Date().getTime();

    let dados = JSON.parse(event.body);

    const { nome, dataNascimento, email, telefone } = dados;

    await dynamoDb
      .update({
        ...params,
        Key: {
          paciente_id: pacienteId
        },
        UpdateExpression:
          'SET nome = :nome, dataNascimento = :dt, email = :email,' 
          + ' telefone = :telefone, updated_at = :updated_at',
        ConditionExpression: 'attribute_exists(paciente_id)',
        ExpressionAttributeValues: {
          ':nome': nome,
          ':dt': dataNascimento,
          ':email': email,
          ':telefone': telefone,
          ':updated_at': timestamp
        }
      })
      .promise()

    return {
      statusCode: 204,
    };

  } catch (err) {
    let error = err.name ? err.name : "Exception"
    let message = err.message ? err.message : "Internal server error"
    let statusCode = err.statusCode ? err.statusCode : 500

    if (error == 'ConditionalCheckFailedException') {
      error = 'Paciente não existe'
      message = `Recurso com id ${pacienteId} não existe e não pode ser atualizado`
      statusCode = 404
    }
    return {
      statusCode,
      body: JSON.stringify({
        error,
        message,
      })
    }
  }
}

module.exports.removerPaciente = async (event) => {
  const { pacienteId } = event.pathParameters
  try {


    await dynamoDb.delete({
      ...params,
      Key: {
        paciente_id: pacienteId
      },
      ConditionExpression: 'attribute_exists(paciente_id)'
    }).promise()

    return {
      statusCode: 204
    }

  } catch (err) {
    let error = err.name ? err.name : "Exception"
    let message = err.message ? err.message : "Internal server error"
    let statusCode = err.statusCode ? err.statusCode : 500

    if (error == 'ConditionalCheckFailedException') {
      error = 'Paciente não existe'
      message = `Recurso com id ${pacienteId} não existe e não pode ser atualizado`
      statusCode = 404
    }
    return {
      statusCode,
      body: JSON.stringify({
        error,
        message,
      })
    }
  }
}