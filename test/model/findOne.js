var chai = require('chai');
var expect = chai.expect;

import serverHelper from '../server-helper';
import Neo4js from '../../src/neo4js';

const schema = {
  text: {},
};
let neo4js;
let DbModel;

describe('findOne', function() {
  before(() => {
    neo4js = serverHelper.getNeo4jsInstance();
    DbModel = neo4js.define('FindOne', schema);
    return neo4js.sync()
      .then(() => DbModel.create({ text: 'asdf' }))
      .then(() => DbModel.create({ text: 'foo' }));
  });

  it('should return a promise', function() {
    expect(DbModel.findOne({ text: 'asdf' })).to.be.instanceof(Promise);
  });

  it('should return exactly one object', function() {
    return DbModel.findOne()
      .then(object => {
        expect(object).to.be.instanceof(Object);
      })
      .catch(err => {
        console.log(err.message);
      });
  });

  it('should return exactly one object', function() {
    return DbModel.findOne()
      .then(object => {
        expect(object.text).to.exist;
      });
  });

  it('should return exactly one object with text = "foo"', function() {
    return DbModel.findOne({ text: 'foo' })
      .then(object => {
        expect(object.text).to.equal('foo');
      });
  });

  it('should return the found object with all of its relations', function() {
    const Person = neo4js.define('FindOne2', {
      name: {
        unique: true
      },
      relations: {
        'knows': {
          to: 'FindOne2'
        },
      },
    });

    let john;
    return Person.create({ name: 'John' })
      .then((result) => {
        john = result;
        return Person.create({ name: 'Clara' });
      })
      .then((clara) => {
        return john
          .relate('knows', { since: 2000 })
          .to(clara)
          .catch(err => {
            expect(err).to.be.false;
            expect(err).to.not.be.instanceof(Error);
          })
          .then(result => {
            expect(result).to.be.true;
            return Person.findOne({ name: 'John' });
          })
          .then(person => {
            expect(person.r).to.be.instanceof(Object);
            expect(person.r.knows).to.be.instanceof(Array);
            expect(person.r.knows.length).to.equal(1);
            expect(person.r.knows[0]).to.be.instanceof(Neo4js.ModelObject);
            expect(person.r.knows[0].name).to.equal('Clara');
          });
      });
  });
});
