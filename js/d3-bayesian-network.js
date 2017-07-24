(function() {
  function cartesianProduct(arr) {
    return _.reduce(arr, function(a, b) {
      return _.flatten(_.map(a, function(x) {
        return _.map(b, function(y) {
          return x.concat([y])
        })
      }), true)
    }, [
      []
    ])
  }
  d3.bayesianNetwork = function(idOrNode, style, width, height) {
    var bbox = $(idOrNode)[0].getBoundingClientRect()
    width = typeof width !== 'undefined' ? width : bbox.width
    height = typeof height !== 'undefined' ? height : 1000
    var nodes = []
    var links = []

    function tabulate(node, columns, data) {
      var foreignObject = node.append("foreignObject")
      var table = foreignObject.append("xhtml:body").style("position", "relative").append("table").style("position", "relative"),
        thead = table.append("thead").data(data),
        tbody = table.append("tbody").data(data)
        // append the header row
      var headerRows = thead.selectAll("tr").data(function(n) {
        var numStates = n.states.length
        var numCols = n.cpt.probabilities.length / numStates
        var parentStates = n.cpt.parents.map(function(p, i) {
          var cols = p.states.map(function(s) {
            var result = {
              text: (p.name + "=" + s)
            }
            if ('currentState' in p) result.active = s == p.currentState
            return result
          })
          return cols
        })
        var matrix = _.zip.apply(_, cartesianProduct(parentStates))
        var columnsActive = null
        matrix.forEach(function(row, rowIndex) {
          columnsActive = columnsActive || new Array(row.length)
          row.forEach(function(col, colIndex) {
            if ('active' in col) {
              if (typeof columnsActive[colIndex] == 'undefined') columnsActive[colIndex] = col.active
              else columnsActive[colIndex] = columnsActive[colIndex] && col.active
            }
          })
        })
        var matrixWithCorrectActiveFlags = matrix.map(function(row) {
          return row.map(function(col, colIndex) {
            if (typeof columnsActive[colIndex] == 'undefined') return col
            else return _.extend({}, col, {
              active: columnsActive[colIndex]
            })
          })
        })
        return matrixWithCorrectActiveFlags.map(function(row) {
          return [{
            text: ""
          }].concat(row)
        }).concat([
          [{
            text: n.name
          }].concat(Array.apply(null, new Array(numCols)).map(function() {
            return {
              text: "prob."
            }
          })).concat([{
            text: "inferred"
          }])
        ])
      }).enter().append("tr")
      headerRows.selectAll("th").data(function(arr) {
          return arr;
        }).enter().append("th").text(function(column) {
          return column.text;
        }).style("color", function(column) {
          return ('active' in column) ? (column.active ? "Green" : "LightGray") : "Black"
        }).attr("colspan", function(column) {
          return column.colspan;
        }).attr("align", "center")
        // create a row for each object in the data
      var rows = tbody.selectAll("tr").data(function(nod) {
          var numStates = nod.states.length
          var sliceLength = nod.cpt.probabilities.length / numStates
          return nod.states.map(function(s, i) {
            var mrg = nod.marginalized.probabilities[i]
            var result = {
              rowData: [s].concat(nod.cpt.probabilities.slice(i * sliceLength, (i + 1) * sliceLength)).concat([mrg])
            }
            if ('currentState' in nod) result.active = s == nod.currentState
            return result
          })
        }).enter().append("tr").style("color", function(column) {
          return ('active' in column) ? (column.active ? "Green" : "LightGray") : "Black"
        })
        // create a cell in each row for each column
      var cells = rows.selectAll("td").data(function(row) {
          return row.rowData
        }).enter().append("td").attr("style", "font-family: Courier") // sets the font style
        .html(function(d) {
          if (isNaN(d)) {
            return d
          } else {
            return Math.round(d * 1000) / 1000
          }
        })
      foreignObject.each(function(d) {
        var tableRect = $(this).find("table")[0].getBoundingClientRect()
        var width = tableRect.width + 4
        var height = tableRect.height + 4
        d3.select(this).attr({
          width: width,
          height: height,
          x: "-" + (width / 2),
          y: "30px"
        })
      })
      return table
    }

    function barChartify(node, data) {
      var barChart = node.append("g").data(data)
      // var container = barChart.append("g").selectAll("rect.container")
      //   .data(function(nod) {
      //     return [nod]
      //   })
      //   .enter()
      //   .append("rect")
      //   .attr("class", "container")
      //   .attr("x", -47)
      //   .attr("y", 15)
      //   .attr("width", 94)
      //   .attr("height", function(n) {
      //     return 8 + n.states.length * 15
      //   })
      //   .attr("fill", "rgb(200, 200, 256)")
      //   .attr("stroke-width", 2)
      //   .attr("stroke", "rgb(100,100,128)")
      var bars = barChart.selectAll("rect.bar")
        .data(function(nod) {
          return nod.marginalized.probabilities
        })
        .enter()
        .append("rect")
        .attr("class", "bar")
        .attr("x", -20)
        .attr("y", function(d, i) {
          return 20 + i * 15
        })
        .attr("width", function(d, i) {
          return +d * 40
        })
        .attr("height", 12)
        .attr("fill", function(d, i) {
          return "rgb(255, 255, " + (i * 10) + ")"
        })

      var texts = barChart.selectAll("text")
        .data(function(nod) {
          return nod.states
        })
        .enter()
        .append("text")
        .text(function(d) {
          return d
        })
        .attr("text-anchor", "middle")
        .attr("x", function(d, i) {
          return 0
        })
        .attr("y", function(d, i) {
          return i * 15 + 30
        })
        .attr("font-family", "sans-serif")
        .attr("font-size", "11px")
        .attr("fill", "black")
      return barChart
    }
    var color = d3.scale.category20()
    var force = d3.layout.force().charge(-10000).linkDistance(300).size([width, height])
    force.nodes(nodes).links(links).start()
    var svg = d3.select(idOrNode).append("svg").attr("width", width).attr("height", height)
      // build the arrow.
    svg.append("svg:defs").selectAll("marker").data(["end"]) // Different link/path types can be defined here
      .enter().append("svg:marker") // This section adds in the arrows
      .attr("id", "markerArrow")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 10)
      .attr("refY", 0)
      .attr("markerWidth", 5)
      .attr("markerHeight", 5)
      .attr("orient", "auto")
      .append("svg:path")
      .attr("d", "M0,-5L10,0L0,5")
    var circleSize = 100
    var textColor = "black"
    var edge = svg.selectAll(".edge")
    var node = svg.selectAll(".node")

    function render(network) {
      console.log("Rendering the following nodes and edges", network.nodes, network.edges)
      network.nodes.forEach(function(node) {
        var existingNode = _.findWhere(nodes, {
          name: node.name
        })
        if (existingNode) {
          _.extend(node, _.pick(existingNode, 'x', 'y', 'px', 'py', 'fixed'))
        }
      })
      nodes.splice(0, nodes.length)
      links.splice(0, links.length)
      network.nodes.forEach(function(n) {
        nodes.push(n)
      })
      network.edges.forEach(function(e) {
        links.push(e)
      })
      edge = edge.data(force.links())
      edge.enter()
        .append("svg:path")
        .attr("class", "link")
        .attr("marker-end", "url(#markerArrow)")
        .style("stroke", "#999")
        .style("stroke-opacity", ".6")
        .style("stroke-width", function(d) {
        return Math.sqrt(16);
      })
      edge.exit().remove()
      var node_drag = d3.behavior.drag().on("dragstart", dragstart).on("drag", dragmove).on("dragend", dragend);

      function dragstart(d, i) {
        force.stop() // stops the force auto positioning before you start dragging
      }

      function dragmove(d, i) {
        d.px += d3.event.dx;
        d.py += d3.event.dy;
        d.x += d3.event.dx;
        d.y += d3.event.dy;
        tick(); // this is the key to make it work together with updating both px,py,x,y on d !
      }

      function dragend(d, i) {
        d.fixed = true; // of course set the node to fixed so the force doesn't include the node in its auto positioning stuff
        tick();
        force.resume();
      }
      node = node.data(force.nodes(), function(d) {
        return d.name;
      })
      node.enter().append("g").attr("class", "node").call(node_drag)
      node.exit().remove()
      node.append("circle").attr("r", circleSize).style("fill", function(d) {
        return color(d.group);
      })
      node.append("text")
        .attr("text-anchor", "middle")
        .attr("dy", "7px")
        .attr("font-size", "20px")
        .attr("font-family", "sans-serif")
        .attr("fill", textColor).attr("stroke", textColor).text(function(d) {
          return d.name;
        })
      node.append("title").text(function(d) {
        return d.name;
      })
      if (style == "cpt") {
        tabulate(node, ["name", "probability"], nodes)
      } else {
        barChartify(node, nodes)
      }


      function tick() {
        edge.attr("d", function(d) {
          var dx = d.target.x - d.source.x,
            dy = d.target.y - d.source.y
          var lineAngle = Math.atan2(dy, dx)
          return "M" + (d.source.x + Math.cos(lineAngle) * circleSize) + ","
            + (d.source.y + Math.sin(lineAngle) * circleSize)
            + "L" + (d.target.x - Math.cos(lineAngle) * circleSize) + ","
            + (d.target.y - Math.sin(lineAngle) * circleSize)
        })
        node.attr("transform", function(d) {
          return "translate(" + d.x + "," + d.y + ")";
        })
      }
      force.on("tick", tick)
      force.start()
    }
    return render
  };
})();
